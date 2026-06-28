# Sweet Potato — Codegraph
<!-- Generated 2026-06-27T13:37:51.602Z by scripts/codegraph.ts — run `pnpm codegraph` to update -->

## Module Dependencies

```mermaid
graph LR
  src_client_main_ts["main"]
  src_server_env_ts["env"]
  src_server_index_ts["index"]
  subgraph src_server_db["db"]
    src_server_db_client_ts["client"]
    src_server_db_migrate_ts["migrate"]
    src_server_db_schema_ts["schema"]
  end
  subgraph src_server_lib["lib"]
    src_server_lib_assets_ts["assets"]
    src_server_lib_password_ts["password"]
    src_server_lib_pinyin_ts["pinyin"]
    src_server_lib_zhuyin_ts["zhuyin"]
  end
  subgraph src_server_plugins["plugins"]
    src_server_plugins_auth_ts["auth"]
    src_server_plugins_session_ts["session"]
    src_server_plugins_static_ts["static"]
    src_server_plugins_view_ts["view"]
  end
  subgraph src_server_routes["routes"]
    src_server_routes_admin_ts["admin"]
    src_server_routes_api_ts["api"]
    src_server_routes_auth_ts["auth"]
    src_server_routes_characters_ts["characters"]
    src_server_routes_public_ts["public"]
    src_server_routes_study_ts["study"]
  end
  subgraph src_client_components["client/components"]
    src_client_components_admin_forms_ts["admin-forms"]
    src_client_components_audio_ts["audio"]
    src_client_components_flashcard_ts["flashcard"]
    src_client_components_theme_ts["theme"]
    src_client_components_toggles_ts["toggles"]
  end
  src_client_main_ts --> src_client_components_theme_ts
  src_client_main_ts --> src_client_components_toggles_ts
  src_client_main_ts --> src_client_components_audio_ts
  src_client_main_ts --> src_client_components_flashcard_ts
  src_client_main_ts --> src_client_components_admin_forms_ts
  src_server_db_client_ts --> src_server_env_ts
  src_server_db_client_ts --> src_server_db_schema_ts
  src_server_db_migrate_ts --> src_server_db_client_ts
  src_server_index_ts --> src_server_env_ts
  src_server_index_ts --> src_server_db_client_ts
  src_server_plugins_auth_ts --> src_server_db_client_ts
  src_server_plugins_auth_ts --> src_server_db_schema_ts
  src_server_plugins_session_ts --> src_server_env_ts
  src_server_plugins_view_ts --> src_server_lib_assets_ts
  src_server_plugins_view_ts --> src_server_env_ts
  src_server_plugins_view_ts --> src_server_db_schema_ts
  src_server_routes_admin_ts --> src_server_db_client_ts
  src_server_routes_admin_ts --> src_server_db_schema_ts
  src_server_routes_admin_ts --> src_server_lib_zhuyin_ts
  src_server_routes_admin_ts --> src_server_lib_pinyin_ts
  src_server_routes_api_ts --> src_server_db_client_ts
  src_server_routes_api_ts --> src_server_db_schema_ts
  src_server_routes_auth_ts --> src_server_db_client_ts
  src_server_routes_auth_ts --> src_server_db_schema_ts
  src_server_routes_auth_ts --> src_server_lib_password_ts
  src_server_routes_characters_ts --> src_server_db_client_ts
  src_server_routes_characters_ts --> src_server_db_schema_ts
  src_server_routes_characters_ts --> src_server_lib_pinyin_ts
  src_server_routes_study_ts --> src_server_db_client_ts
  src_server_routes_study_ts --> src_server_db_schema_ts
```

## Database Schema

```mermaid
erDiagram
  users {
    integer id PK
    text email UK
    text password_hash
    text role
    text display_name
    integer created_at
  }
  characters {
    integer id PK
    text traditional UK
    text simplified
    text pinyin
    text pinyin_search
    text zhuyin
    text definition
    integer hsk_level
    integer frequency_rank
    integer created_at
    integer updated_at
  }
  example_sentences {
    integer id PK
    integer character_id
    text traditional
    text simplified
    text pinyin
    text zhuyin
    text translation
    text notes
    integer sort_order
    integer created_at
    integer updated_at
  }
  reviews {
    integer id PK
    integer user_id
    integer character_id
    text rating
    integer reviewed_at
  }
  characters ||--o{ example_sentences : ""
  users ||--o{ reviews : ""
  characters ||--o{ reviews : ""
```

## Request Flow & Auth Guards

```mermaid
graph TD
  Req([HTTP Request])
  Req --> SessionHook[Session hook\nresolve userId]
  SessionHook --> Guard{Auth guard}
  Guard -->|public| PubRoutes[Public routes]
  Guard -->|requireUser| UserRoutes[User routes]
  Guard -->|requireAdmin| AdminRoutes[Admin routes]
  UserRoutes -->|no session| LoginRedir[redirect /login]
  AdminRoutes -->|not admin| Forbidden[403 /pages/error]
  PubRoutes --> PubList["GET /login
POST /login
POST /logout
GET /"]
  UserRoutes --> UserList["POST /api/reviews
GET /characters
GET /characters/:id
GET /study"]
  AdminRoutes --> AdminList["GET /admin
GET /admin/characters
GET /admin/characters/new
GET /admin/characters/:id/edit
POST /admin/characters
POST /admin/characters/:id
POST /admin/characters/:id/delete
POST /admin/derive-zhuyin
POST /admin/characters/:id/sentences
POST /admin/sentences/:id
POST /admin/sentences/:id/delete"]
```

## Alpine Client Components

```mermaid
graph LR
  main["client/main.ts"]
  data_adminForm["data: adminForm"]
  main --> data_adminForm
  store_audio["store: audio"]
  main --> store_audio
  data_flashcard["data: flashcard"]
  main --> data_flashcard
  data_theme["data: theme"]
  main --> data_theme
  store_display["store: display"]
  main --> store_display
```
