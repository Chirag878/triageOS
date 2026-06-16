alter table triage_items add column external_url text;
alter table triage_items add column ai_model text;
alter table triage_items add column ai_generated_at timestamptz;
alter table triage_items add column ai_output_version text;
alter table triage_items add column content_hash text;

create index triage_items_user_status_received_at_idx on triage_items (user_id, status, received_at desc);
create index triage_items_user_priority_label_idx on triage_items (user_id, priority_label);
create index triage_items_user_workflow_type_idx on triage_items (user_id, workflow_type);
create index action_logs_user_created_at_idx on action_logs (user_id, created_at desc);
