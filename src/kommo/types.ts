// ==================== LEADS ====================

export interface Lead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  group_id: number;
  status_id: number;
  pipeline_id: number;
  loss_reason_id: number | null;
  source_id: number | null;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  closest_task_at: number | null;
  is_deleted: boolean;
  custom_fields_values: CustomFieldValue[] | null;
  score: number | null;
  account_id: number;
  labor_cost: number;
  is_price_modified_by_robot?: boolean;
  _embedded?: LeadEmbedded;
}

export interface LeadEmbedded {
  loss_reason?: LossReason[];
  tags?: Tag[];
  contacts?: EmbeddedContact[];
  companies?: EmbeddedCompany[];
  catalog_elements?: CatalogElement[];
  source?: Source;
}

export interface LossReason {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string | null;
}

export interface EmbeddedContact {
  id: number;
  is_main: boolean;
}

export interface EmbeddedCompany {
  id: number;
}

export interface CatalogElement {
  id: number;
  metadata: Record<string, unknown>;
  quantity: number;
  catalog_id: number;
}

export interface Source {
  id: number;
  name: string;
}

export interface CustomFieldValue {
  field_id: number;
  field_name?: string;
  field_code?: string;
  field_type?: string;
  values: CustomFieldValueItem[];
}

export interface CustomFieldValueItem {
  value: string | number | boolean;
  enum_id?: number;
  enum_code?: string;
}

export interface LeadsListResponse {
  _page: number;
  _links: Links;
  _embedded: {
    leads: Lead[];
  };
}

export interface LeadUpdateRequest {
  name?: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  loss_reason_id?: number;
  custom_fields_values?: CustomFieldValue[];
  _embedded?: {
    tags?: { id?: number; name?: string }[];
  };
}

// ==================== PIPELINES ====================

export interface Pipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded?: {
    statuses: PipelineStage[];
  };
}

export interface PipelineStage {
  id: number;
  name: string;
  sort: number;
  is_editable: boolean;
  pipeline_id: number;
  color: string;
  type: number;
  account_id: number;
}

export interface PipelinesListResponse {
  _links: Links;
  _embedded: {
    pipelines: Pipeline[];
  };
}

export interface StagesListResponse {
  _links: Links;
  _embedded: {
    statuses: PipelineStage[];
  };
}

// ==================== TASKS ====================

export interface Task {
  id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  responsible_user_id: number;
  group_id: number;
  entity_id: number;
  entity_type: EntityType;
  is_completed: boolean;
  task_type_id: number;
  text: string;
  duration: number;
  complete_till: number;
  result?: TaskResult;
  account_id: number;
}

export interface TaskResult {
  text: string;
}

export interface TaskCreateRequest {
  task_type_id: number;
  text: string;
  complete_till: number;
  entity_id: number;
  entity_type: EntityType;
  responsible_user_id?: number;
  is_completed?: boolean;
  result?: TaskResult;
  request_id?: string;
}

export interface TasksCreateResponse {
  _links: Links;
  _embedded: {
    tasks: Task[];
  };
}

// ==================== NOTES ====================

export type NoteType =
  | "common"
  | "call_in"
  | "call_out"
  | "service_message"
  | "message_cashier"
  | "sms_in"
  | "sms_out";

export interface Note {
  id: number;
  entity_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  responsible_user_id: number;
  group_id: number;
  note_type: NoteType;
  params: NoteParams;
  account_id: number;
}

export interface NoteParams {
  text?: string;
  service?: string;
  [key: string]: unknown;
}

export interface NoteCreateRequest {
  entity_id?: number;
  note_type: NoteType;
  params: NoteParams;
  request_id?: string;
}

export interface NotesCreateResponse {
  _links: Links;
  _embedded: {
    notes: Note[];
  };
}

// ==================== COMMON ====================

export type EntityType = "leads" | "contacts" | "companies";

export interface Links {
  self?: { href: string };
  next?: { href: string };
  prev?: { href: string };
}

export interface LeadsFilter {
  id?: number[];
  pipeline_id?: number[];
  status_id?: number[];
  responsible_user_id?: number[];
  created_at?: DateRange;
  updated_at?: DateRange;
  closed_at?: DateRange;
}

export interface DateRange {
  from?: number;
  to?: number;
}

export interface OrderBy {
  field: "created_at" | "updated_at" | "id";
  direction: "asc" | "desc";
}
