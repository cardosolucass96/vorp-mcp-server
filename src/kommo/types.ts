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

// ==================== CONTACTS ====================

export interface Contact {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  responsible_user_id: number;
  group_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  closest_task_at: number | null;
  is_deleted: boolean;
  custom_fields_values: CustomFieldValue[] | null;
  account_id: number;
  _embedded?: ContactEmbedded;
}

export interface ContactEmbedded {
  tags?: Tag[];
  leads?: EmbeddedLead[];
  customers?: EmbeddedCustomer[];
  catalog_elements?: CatalogElement[];
  companies?: EmbeddedCompany[];
}

export interface EmbeddedLead {
  id: number;
}

export interface EmbeddedCustomer {
  id: number;
}

export interface ContactsListResponse {
  _page: number;
  _links: Links;
  _embedded: {
    contacts: Contact[];
  };
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

export interface LeadCreateRequest {
  name: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  custom_fields_values?: CustomFieldValue[];
  _embedded?: {
    contacts?: Array<{
      id?: number;
      first_name?: string;
      last_name?: string;
      name?: string;
      custom_fields_values?: CustomFieldValue[];
    }>;
    tags?: { id?: number; name?: string }[];
  };
}

export interface LeadCreateResponse {
  _links: Links;
  _embedded: {
    leads: Lead[];
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

export interface TasksListResponse {
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

export interface NotesListResponse {
  _links: Links;
  _embedded: {
    notes: Note[];
  };
}

// ==================== COMPANIES ====================

export interface Company {
  id: number;
  name: string;
  responsible_user_id: number;
  group_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  closest_task_at: number | null;
  is_deleted: boolean;
  custom_fields_values: CustomFieldValue[] | null;
  account_id: number;
  _embedded?: {
    tags?: Tag[];
    contacts?: EmbeddedContact[];
    leads?: EmbeddedLead[];
  };
}

export interface CompaniesListResponse {
  _links: Links;
  _embedded: {
    companies: Company[];
  };
}

// ==================== COMMON ====================

export type EntityType = "leads" | "contacts" | "companies";

export interface Links {
  self?: { href: string };
  next?: { href: string };
  prev?: { href: string };
}

// ==================== USERS ====================

export interface User {
  id: number;
  name: string;
  email: string;
  lang: string;
  rights: {
    lead_add: string;
    lead_view: string;
    lead_edit: string;
    lead_delete: string;
    lead_export: string;
    contact_add: string;
    contact_view: string;
    contact_edit: string;
    contact_delete: string;
    contact_export: string;
    company_add: string;
    company_view: string;
    company_edit: string;
    company_delete: string;
    company_export: string;
  };
  _embedded?: {
    groups?: Array<{ id: number; name: string }>;
  };
}

export interface UsersListResponse {
  _page: number;
  _links: Links;
  _embedded: {
    users: User[];
  };
}

// ==================== FILTERS ====================

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

// ==================== CONVERSATIONS ====================

export interface Talk {
  talk_id: number;
  created_at: number;
  updated_at: number;
  rate: number;
  contact_id: number;
  chat_id: string;
  entity_id: number | null;
  entity_type: string | null;
  status: "in_work" | "closed";
  is_in_work: boolean;
  is_read: boolean;
  origin: string;
  source_id: number;
  account_id: number;
  _links?: any;
  _embedded?: {
    contacts?: Array<{ id: number; _links?: any }>;
    leads?: Array<{ id: number; _links?: any }>;
    customers?: Array<any>;
  };
}

export interface TalksListResponse {
  _page: number;
  _links: any;
  _embedded: {
    talks: Talk[];
  };
}

export interface ConversationMessage {
  id: string;
  created_at: number;
  author_id: number;
  message_type: "text" | "picture" | "file" | "audio" | "video" | "sticker" | "system";
  text: string | null;
  attachment?: {
    id: string;
    type: string;
    link: string;
    media?: string;
  };
}

export interface Conversation {
  id: string;
  chat_id: string;
  created_at: number;
  updated_at: number;
  messages: ConversationMessage[];
}

export interface ConversationsListResponse {
  _embedded: {
    conversations: Conversation[];
  };
}

// ==================== EVENTS ====================

export interface KommoEvent {
  id: string;
  type: string;
  entity_id: number;
  entity_type: string;
  created_by: number;
  created_at: number;
  value_after: EventValue[];
  value_before: EventValue[];
  account_id: number;
  _embedded?: {
    entity?: {
      id: number;
      name?: string;
    };
  };
}

export interface EventValue {
  message?: {
    id: string;
    text?: string;
    origin: string;
    author_id?: number;
    talk_id?: number;
  };
  note?: {
    id: number;
  };
  [key: string]: any;
}

export interface EventsListResponse {
  _page: number;
  _links: any;
  _embedded: {
    events: KommoEvent[];
  };
}
