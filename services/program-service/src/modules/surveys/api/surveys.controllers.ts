import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  TOKEN_VERIFIER,
  TokenVerifier,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  eventFeedbackLinkSchema,
  eventSlugSchema,
  publicSurveyQuerySchema,
  publicSurveySchema,
  surveyCreateRequestSchema,
  surveyExportQuerySchema,
  surveyListQuerySchema,
  surveyListSchema,
  surveyResultsSchema,
  surveySchema,
  surveyStatusRequestSchema,
  surveySubmitRequestSchema,
  surveyUpdateRequestSchema,
  type PublicSurvey,
  type PublicSurveyQuery,
  type PublicSurveyState,
  type SurveyCreateRequest,
  type SurveyExportQuery,
  type SurveyListQuery,
  type SurveyStatusRequest,
  type SurveySubmitRequest,
  type SurveyUpdateRequest,
  type SurveyView,
} from "@lavieco/shared/events";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { SurveyService } from "../application/survey-service";
import { consentRequired, type SurveyRecord } from "../domain/survey";
import { SURVEY_SERVICE } from "../surveys.tokens";

const idPipe = new ZodValidationPipe(objectIdSchema);
const slugPipe = new ZodValidationPipe(eventSlugSchema);

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function toSurveyDto(survey: SurveyRecord): SurveyView {
  return {
    ...survey,
    settings: {
      ...survey.settings,
      opensAt: iso(survey.settings.opensAt),
      closesAt: iso(survey.settings.closesAt),
    },
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  };
}

const actorOf = (staff: StaffPrincipal) => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** Surveys in the back office. Reading needs `survey:read`, changes `survey:write`. */
@ApiTags("surveys")
@Controller("internal/v1/surveys")
export class SurveysAdminController {
  constructor(
    @Inject(SURVEY_SERVICE) private readonly surveys: SurveyService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  @Get()
  @RequirePermission("survey:read")
  @ApiOperation({ summary: "Surveys, filtered by kind, status or event" })
  @ApiZodResponse(200, surveyListSchema)
  async list(@ZodQuery(surveyListQuerySchema) query: SurveyListQuery) {
    const page = await this.surveys.list(query);
    return { items: page.items.map(toSurveyDto), nextCursor: page.nextCursor };
  }

  @Post()
  @RequirePermission("survey:write")
  @ApiOperation({ summary: "Create a survey as a draft" })
  @ApiZodResponse(201, surveySchema)
  async create(
    @ZodBody(surveyCreateRequestSchema) body: SurveyCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toSurveyDto(await this.surveys.create(body, actorOf(staff)));
  }

  @Get(":id")
  @RequirePermission("survey:read")
  @ApiOperation({ summary: "One survey" })
  @ApiZodResponse(200, surveySchema)
  async get(@Param("id", idPipe) id: string) {
    return toSurveyDto(await this.surveys.get(id));
  }

  @Patch(":id")
  @RequirePermission("survey:write")
  @ApiOperation({ summary: "Edit a survey; answered questions can only be reworded" })
  @ApiZodResponse(200, surveySchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(surveyUpdateRequestSchema) body: SurveyUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toSurveyDto(await this.surveys.update(id, body, actorOf(staff)));
  }

  @Post(":id/status")
  @HttpCode(200)
  @RequirePermission("survey:write")
  @ApiOperation({ summary: "Open or close a survey" })
  @ApiZodResponse(200, surveySchema)
  async setStatus(
    @Param("id", idPipe) id: string,
    @ZodBody(surveyStatusRequestSchema) body: SurveyStatusRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toSurveyDto(await this.surveys.setStatus(id, body, actorOf(staff)));
  }

  @Post(":id/duplicate")
  @RequirePermission("survey:write")
  @ApiOperation({ summary: "A draft copy with the same questions" })
  @ApiZodResponse(201, surveySchema)
  async duplicate(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return toSurveyDto(await this.surveys.duplicate(id, actorOf(staff)));
  }

  @Get(":id/results")
  @RequirePermission("survey:read")
  @ApiOperation({ summary: "Summary per question and the latest responses" })
  @ApiZodResponse(200, surveyResultsSchema)
  async results(@Param("id", idPipe) id: string) {
    const { total, questions, responses } = await this.surveys.results(id);
    return { total, questions, responses };
  }

  @Get(":id/export")
  @RequirePermission("survey:read")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiOperation({ summary: "Excel or CSV of every response (may hold personal data): step-up" })
  async export(
    @Param("id", idPipe) id: string,
    @ZodQuery(surveyExportQuerySchema) query: SurveyExportQuery,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    const file = await this.surveys.export(id, query.format, actorOf(staff));
    return new StreamableFile(file.content, {
      type: file.contentType,
      disposition: `attachment; filename="${file.fileName}"`,
      length: file.content.length,
    });
  }
}

function toPublicSurvey(survey: SurveyRecord, state: PublicSurveyState): PublicSurvey {
  return {
    state,
    slug: survey.slug,
    title: survey.title,
    intro: survey.intro,
    thankYouMessage: survey.thankYouMessage,
    // Nothing to fill in unless it is open: the page only shows why.
    questions: state === "open" ? survey.questions : [],
    collectEmail: survey.settings.collectEmail,
    collectName: survey.settings.collectName,
    consentText: survey.settings.consentText,
    consentRequired: consentRequired(survey.settings),
    anonymous: survey.settings.anonymous,
    opensAt: iso(survey.settings.opensAt),
  };
}

/** `/khao-sat/[slug]`, called by the `web` BFF. */
@ApiTags("surveys")
@Controller("internal/v1")
export class SurveysPublicController {
  constructor(@Inject(SURVEY_SERVICE) private readonly surveys: SurveyService) {}

  @Get("public-surveys/:slug")
  @AllowServices("web")
  @ApiOperation({ summary: "A survey as shown to a visitor, with why it cannot be answered" })
  @ApiZodResponse(200, publicSurveySchema)
  async get(
    @Param("slug", slugPipe) slug: string,
    @ZodQuery(publicSurveyQuerySchema) query: PublicSurveyQuery,
  ) {
    const { survey, state } = await this.surveys.getPublic(slug, query);
    return toPublicSurvey(survey, state);
  }

  @Post("public-surveys/:slug/responses")
  @HttpCode(204)
  @AllowServices("web")
  @ApiOperation({ summary: "Answer a survey; rate limited, one answer per ticket/email/browser" })
  @ApiZodResponse(204)
  async submit(
    @Param("slug", slugPipe) slug: string,
    @ZodBody(surveySubmitRequestSchema) body: SurveySubmitRequest,
  ) {
    await this.surveys.submit(slug, body);
  }

  @Get("published-events/:slug/feedback-survey")
  @AllowServices("web")
  @ApiOperation({ summary: "The open feedback survey of an event, for its ticket pages" })
  @ApiZodResponse(200, eventFeedbackLinkSchema)
  feedback(@Param("slug", slugPipe) slug: string) {
    return this.surveys.feedbackLink(slug);
  }
}
