import type { FlowspaceDocument, TeamBlueprint, WorkflowTemplate } from "../types.ts";
import {
  allTemplates as coreAllTemplates,
  builtinTemplates as coreBuiltinTemplates,
  captureTemplate as coreCaptureTemplate,
  localizedStarterDocument as coreLocalizedStarterDocument,
} from "../core/templates.ts";
import { getLanguage, type Locale } from "./i18n.ts";

export {
  buildSnapshot,
  computeSyncPlan,
  contentFlowTemplateId,
  instantiateTemplate,
  synchronizeTemplate,
  teamDependenciesFor,
  teamRevisionDifferences,
  type SyncPlan,
} from "../core/templates.ts";

export function builtinTemplates(locale: Locale = getLanguage()): WorkflowTemplate[] {
  return coreBuiltinTemplates(locale);
}

export function localizedStarterDocument(
  locale: Locale = getLanguage(),
  workspaceCwd?: string,
  workspaceId?: string,
  baseDoc?: FlowspaceDocument,
): FlowspaceDocument {
  return coreLocalizedStarterDocument(locale, workspaceCwd, workspaceId, baseDoc);
}

export function allTemplates(
  doc: FlowspaceDocument,
  locale: Locale = getLanguage(),
): WorkflowTemplate[] {
  return coreAllTemplates(doc, locale);
}

export function captureTemplate(
  doc: FlowspaceDocument,
  groupId: string,
  title: string,
  description: string,
  teams: TeamBlueprint[] = [],
  locale: Locale = getLanguage(),
): WorkflowTemplate {
  return coreCaptureTemplate(doc, groupId, title, description, teams, locale);
}
