import type { TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import type {
  FormQuestion,
  PublicSurveyQuery,
  PublicSurveyState,
  SurveyCreateRequest,
  SurveyListQuery,
  SurveyStatusRequest,
  SurveySubmitRequest,
  SurveyUpdateRequest,
} from "@lavieco/shared/events";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import {
  answerLabel,
  assertCanOpen,
  assertSurveyChangeAllowed,
  consentRequired,
  summarize,
  surveyStateOf,
  toSurveyChanges,
  validateSurveyAnswers,
  type SurveyAnswer,
  type SurveyRecord,
} from "../domain/survey";

export const SURVEY_REPOSITORY = Symbol("SURVEY_REPOSITORY");
export const SURVEY_RESPONSE_REPOSITORY = Symbol("SURVEY_RESPONSE_REPOSITORY");

export class SurveySlugTakenError extends Error {
  override name = "SurveySlugTakenError";
}
export class SurveyAlreadyAnsweredError extends Error {
  override name = "SurveyAlreadyAnsweredError";
}

export type SurveyChanges = ReturnType<typeof toSurveyChanges>;

export interface SurveyRepository {
  newId(): string;
  insert(id: string, changes: SurveyChanges, tx?: TxContext): Promise<SurveyRecord>;
  update(
    id: string,
    revision: number,
    changes: SurveyChanges,
    tx?: TxContext,
  ): Promise<SurveyRecord | null>;
  setStatus(
    id: string,
    revision: number,
    status: SurveyRecord["status"],
    tx?: TxContext,
  ): Promise<SurveyRecord | null>;
  findById(id: string): Promise<SurveyRecord | null>;
  findBySlug(slug: string): Promise<SurveyRecord | null>;
  /** The latest open feedback survey of an event. */
  findOpenFeedback(eventId: string): Promise<SurveyRecord | null>;
  list(query: SurveyListQuery): Promise<{ items: SurveyRecord[]; nextCursor: string | null }>;
  /** Adds one response if the survey is still open and under its limit. */
  countResponse(id: string, maxResponses: number | null, tx: TxContext): Promise<boolean>;
}

export type SurveyResponseRecord = {
  id: string;
  surveyId: string;
  answers: SurveyAnswer[];
  name: string | null;
  email: string | null;
  ticketId: string | null;
  orderId: string | null;
  consentAt: Date | null;
  submittedAt: Date;
};

export interface SurveyResponseRepository {
  /** Throws `SurveyAlreadyAnsweredError` when this `dedupeKey` already answered. */
  insert(
    response: Omit<SurveyResponseRecord, "id"> & { dedupeKey: string },
    tx: TxContext,
  ): Promise<void>;
  exists(surveyId: string, dedupeKey: string): Promise<boolean>;
  /** Newest first. */
  list(surveyId: string, limit?: number): Promise<SurveyResponseRecord[]>;
  count(surveyId: string): Promise<number>;
}

/** The ticket behind a share token (`?t=`), or null. Provided by the orders module. */
export type SurveyTicketResolver = (
  token: string,
) => Promise<{ ticketId: string; orderId: string; eventId: string } | null>;

export type SurveyActor = { userId: string; roles: readonly Role[]; requestId: string | null };

export type Sheet = { fileName: string; header: string[]; rows: string[][] };
export type SheetFile = { fileName: string; contentType: string; content: Buffer };
export type SurveySheetWriter = (sheet: Sheet, format: "xlsx" | "csv") => Promise<SheetFile>;

const RESPONSE_LIMIT = { perIp: 30, windowSeconds: 600 } as const;
const RESPONSES_SHOWN = 50;

type Limiter = {
  hit(
    key: string,
    limit: number,
    windowSeconds: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
};

const cellSafe = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

/**
 * Surveys (ADR-0025): standalone ones (a school project, a study) and event feedback.
 * Anonymous means it: only a keyed hash is stored to refuse a second answer, never the
 * ticket, the order, the email or the name.
 */
export class SurveyService {
  constructor(
    private readonly surveys: SurveyRepository,
    private readonly responses: SurveyResponseRepository,
    private readonly resolveTicket: SurveyTicketResolver,
    private readonly baseValidate: (
      questions: readonly FormQuestion[],
      answers: Readonly<Record<string, string | string[]>>,
    ) => { questionId: string; value: string | string[] }[],
    private readonly limiter: Limiter,
    private readonly hashKey: (value: string) => string,
    private readonly writeSheet: SurveySheetWriter,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
    private readonly eventIdOf: (slug: string) => Promise<string | null>,
  ) {}

  // ----- back office

  list(query: SurveyListQuery) {
    return this.surveys.list(query);
  }

  async get(id: string): Promise<SurveyRecord> {
    const survey = await this.surveys.findById(id);
    if (!survey) throw new DomainError("common.not_found");
    return survey;
  }

  create(input: SurveyCreateRequest, actor: SurveyActor, now = new Date()) {
    return this.guardSlug(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.surveys.insert(this.surveys.newId(), toSurveyChanges(input), tx);
        await this.record("survey.create", saved, actor, now, tx);
        return saved;
      }),
    );
  }

  async update(id: string, input: SurveyUpdateRequest, actor: SurveyActor, now = new Date()) {
    const current = await this.get(id);
    const changes = toSurveyChanges(input);
    assertSurveyChangeAllowed(current, changes);
    return this.guardSlug(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.surveys.update(id, input.revision, changes, tx);
        if (!saved) throw new DomainError("common.conflict");
        await this.record("survey.update", saved, actor, now, tx);
        return saved;
      }),
    );
  }

  async setStatus(id: string, input: SurveyStatusRequest, actor: SurveyActor, now = new Date()) {
    const current = await this.get(id);
    if (input.status === "open") assertCanOpen(current);
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.surveys.setStatus(id, input.revision, input.status, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.record("survey.status", saved, actor, now, tx);
      return saved;
    });
  }

  /** "Nhân bản": a draft with the same questions, no responses. */
  async duplicate(id: string, actor: SurveyActor, now = new Date()) {
    const source = await this.get(id);
    let slug = `${source.slug}-ban-sao`;
    for (let n = 2; await this.surveys.findBySlug(slug); n += 1) {
      slug = `${source.slug}-ban-sao-${n}`;
    }
    const changes: SurveyChanges = {
      kind: source.kind,
      eventId: source.eventId,
      slug,
      title: source.title,
      intro: source.intro,
      thankYouMessage: source.thankYouMessage,
      questions: source.questions,
      settings: source.settings,
    };
    return this.guardSlug(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.surveys.insert(this.surveys.newId(), changes, tx);
        await this.record("survey.create", saved, actor, now, tx);
        return saved;
      }),
    );
  }

  async results(id: string) {
    const survey = await this.get(id);
    const responses = await this.responses.list(id);
    const questions = new Map(survey.questions.map((question) => [question.id, question]));
    return {
      survey,
      total: responses.length,
      questions: summarize(survey.questions, responses),
      responses: responses.slice(0, RESPONSES_SHOWN).map((response) => ({
        id: response.id,
        submittedAt: response.submittedAt.toISOString(),
        name: response.name,
        email: response.email,
        answers: Object.fromEntries(
          response.answers.map((answer) => [
            answer.questionId,
            answerLabel(questions.get(answer.questionId), answer),
          ]),
        ),
      })),
    };
  }

  /** Step-up is checked by the controller; may hold personal data, so it is audited. */
  async export(id: string, format: "xlsx" | "csv", actor: SurveyActor, now = new Date()) {
    const survey = await this.get(id);
    const responses = await this.responses.list(id);
    const asked = survey.questions.filter((question) => question.type !== "section");
    const questions = new Map(asked.map((question) => [question.id, question]));
    const pii = !survey.settings.anonymous;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
    const when = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      timeStyle: "short",
    });
    const sheet: Sheet = {
      fileName: `LAVIECO_khao-sat_${survey.slug}_${day}`,
      header: [
        "STT",
        "Thời gian",
        ...(pii ? ["Họ tên", "Email"] : []),
        ...asked.map((question) => question.label),
      ],
      rows: responses.map((response, index) =>
        [
          String(index + 1),
          when.format(response.submittedAt),
          ...(pii ? [response.name ?? "", response.email ?? ""] : []),
          ...asked.map((question) => {
            const answer = response.answers.find((item) => item.questionId === question.id);
            return answer ? answerLabel(questions.get(question.id), answer) : "";
          }),
        ].map(cellSafe),
      ),
    };
    const file = await this.writeSheet(sheet, format);
    await this.unitOfWork.run((tx) =>
      this.audit.record(
        tx,
        {
          action: "survey.export",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "survey", id: survey.id },
          requestId: actor.requestId,
          meta: { rows: responses.length, format },
        },
        now,
      ),
    );
    return file;
  }

  // ----- public

  /** What a visitor sees; a draft does not exist for them. */
  async getPublic(slug: string, query: PublicSurveyQuery, now = new Date()) {
    const survey = await this.surveys.findBySlug(slug);
    if (!survey || survey.status === "draft") throw new DomainError("common.not_found");
    return { survey, state: await this.visitorState(survey, query, now) };
  }

  async feedbackLink(eventSlug: string, now = new Date()) {
    const eventId = await this.eventIdOf(eventSlug);
    const survey = eventId ? await this.surveys.findOpenFeedback(eventId) : null;
    return { slug: survey && surveyStateOf(survey, now) === "open" ? survey.slug : null };
  }

  async submit(slug: string, input: SurveySubmitRequest, now = new Date()): Promise<void> {
    if (input.clientIp) {
      const { allowed, retryAfterSeconds } = await this.limiter.hit(
        this.hashKey(`survey:ip:${input.clientIp}`),
        RESPONSE_LIMIT.perIp,
        RESPONSE_LIMIT.windowSeconds,
        now,
      );
      if (!allowed) throw new DomainError("common.rate_limited", undefined, { retryAfterSeconds });
    }
    const survey = await this.surveys.findBySlug(slug);
    if (!survey || survey.status === "draft") throw new DomainError("common.not_found");
    if (surveyStateOf(survey, now) !== "open") throw new DomainError("survey.closed");

    const { settings } = survey;
    const ticket = input.ticketToken ? await this.resolveTicket(input.ticketToken) : null;
    const ticketFits = ticket !== null && ticket.eventId === survey.eventId;
    if (settings.access === "ticket_holders" && !ticketFits) {
      throw new DomainError("survey.link_invalid");
    }
    if (consentRequired(settings) && !input.consent) {
      throw new DomainError("survey.consent_required");
    }
    const answers = this.validate(survey, input);
    const email = settings.collectEmail === "off" ? null : (input.email?.trim() ?? null);
    const name = settings.collectName === "off" ? null : input.name?.trim() || null;
    if (settings.collectEmail === "required" && !email) {
      throw new DomainError("survey.answers_invalid", "email required");
    }
    if (settings.collectName === "required" && !name) {
      throw new DomainError("survey.answers_invalid", "name required");
    }
    const dedupeKey = this.dedupeKeyOf(survey, {
      ticketId: ticketFits ? ticket.ticketId : null,
      email,
      respondentId: input.respondentId ?? null,
    });
    if (!dedupeKey) throw new DomainError("survey.link_invalid");

    try {
      await this.unitOfWork.run(async (tx) => {
        const counted = await this.surveys.countResponse(survey.id, settings.maxResponses, tx);
        if (!counted) throw new DomainError("survey.closed");
        await this.responses.insert(
          {
            surveyId: survey.id,
            dedupeKey,
            answers,
            // Anonymous: the hash above is all that is kept of who answered.
            name: settings.anonymous ? null : name,
            email: settings.anonymous ? null : email,
            ticketId: !settings.anonymous && ticketFits ? ticket.ticketId : null,
            orderId: !settings.anonymous && ticketFits ? ticket.orderId : null,
            consentAt: input.consent ? now : null,
            submittedAt: now,
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof SurveyAlreadyAnsweredError) {
        throw new DomainError("survey.already_answered");
      }
      throw error;
    }
  }

  private validate(survey: SurveyRecord, input: SurveySubmitRequest) {
    try {
      return validateSurveyAnswers(survey.questions, input.answers, this.baseValidate);
    } catch (error) {
      // The shared check speaks of orders; a visitor is answering a survey.
      if (error instanceof DomainError && error.code === "order.answers_invalid") {
        throw new DomainError("survey.answers_invalid", error.detail);
      }
      throw error;
    }
  }

  private async visitorState(
    survey: SurveyRecord,
    query: PublicSurveyQuery,
    now: Date,
  ): Promise<PublicSurveyState> {
    const state = surveyStateOf(survey, now);
    const ticket = query.t ? await this.resolveTicket(query.t) : null;
    const ticketFits = ticket !== null && ticket.eventId === survey.eventId;
    if (survey.settings.access === "ticket_holders" && !ticketFits) return "invalid_link";
    if (state !== "open") return state;
    const key = this.dedupeKeyOf(survey, {
      ticketId: ticketFits ? ticket.ticketId : null,
      email: null,
      respondentId: query.r ?? null,
    });
    return key && (await this.responses.exists(survey.id, key)) ? "already_answered" : "open";
  }

  /** A keyed hash, per survey: answers of two surveys cannot be matched to each other. */
  private dedupeKeyOf(
    survey: SurveyRecord,
    who: { ticketId: string | null; email: string | null; respondentId: string | null },
  ): string | null {
    const raw =
      survey.settings.onePer === "ticket"
        ? who.ticketId && `ticket:${who.ticketId}`
        : survey.settings.onePer === "email"
          ? who.email && `email:${normalizeEmail(who.email)}`
          : who.respondentId && `browser:${who.respondentId}`;
    return raw ? this.hashKey(`survey:${survey.id}:${raw}`) : null;
  }

  private async guardSlug<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof SurveySlugTakenError) throw new DomainError("survey.slug_taken");
      throw error;
    }
  }

  private record(
    action: "survey.create" | "survey.update" | "survey.status",
    survey: SurveyRecord,
    actor: SurveyActor,
    now: Date,
    tx: TxContext,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type: "survey", id: survey.id },
        requestId: actor.requestId,
        meta: { slug: survey.slug, status: survey.status },
      },
      now,
    );
  }
}
