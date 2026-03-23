// ========================================================================
// API DEFINITIONS
// API 목록을 여기에 추가/수정하세요.
//
// 구조:
// {
//   id: string,              // 고유 ID
//   group: string,           // 그룹명 (사이드바 카테고리)
//   groupIcon: string,       // FontAwesome 아이콘 클래스
//   name: string,            // API 표시 이름
//   method: string,          // HTTP 메서드 (GET|POST|PUT|PATCH|DELETE)
//   path: string,            // 경로 ({변수명} 형태로 path parameter 지정)
//   description: string,     // 설명
//   requiresAuth: boolean,   // true → Authorization 헤더 자동 삽입
//   pathParams: [            // Path Parameters
//     { key: string, description: string, required: boolean, default: string }
//   ],
//   queryParams: [           // Query Parameters
//     { key: string, description: string, required: boolean, default: string }
//   ],
//   defaultBody: object|null // 기본 Body (POST/PUT/PATCH 등)
// }
// ========================================================================
const API_LIST = [
    // ──────────────────────────────────────────────────────────────────────
    // 인증
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'auth_access_token',
        group: '인증',
        groupIcon: 'fa-key',
        opaCode: 'OPA2_001',
        name: 'Access Token 발급',
        method: 'POST',
        path: '/v2.0/api_auth/access_token',
        description: 'API Key와 비밀 키를 사용하여 Access Token을 발급합니다.',
        requiresAuth: false,
        pathParams: [],
        queryParams: [],
        defaultHeaders: [
            { key: 'Authorization', description: 'Bearer + Base64(API Key) — API Key 값을 Base64 인코딩하여 입력 (예: Bearer dGVzdA==)', value: '' },
            { key: 'eformsign_signature', description: '비밀 키(Secret Key)로 생성한 ECDSA 서명값', value: '' },
        ],
        defaultBody: { execution_time: 0, member_id: '' },
        exampleResponse: {
            success: {
                "api_key": {
                    "name": "string",
                    "alias": "string",
                    "company": {
                        "company_id": "string",
                        "name": "string",
                        "api_url": "string"
                    }
                },
                "oauth_token": {
                    "expires_in": "number",
                    "token_type": "string",
                    "refresh_token": "string",
                    "access_token": "string"
                }
            },
            errors: [
                {
                    title: '유효 시간 만료 (4000002)',
                    body: {
                        "code": "4000002",
                        "ErrorMessage": "The validation time has expired.",
                        "execution_time": "number"
                    }
                },
                {
                    title: '서명 오류 (4030004)',
                    body: {
                        "code": "4030004",
                        "ErrorMessage": "The signature is invalid."
                    }
                },
                {
                    title: '유효하지 않은 API Key (4030001)',
                    body: {
                        "code": "4030001",
                        "ErrorMessage": "invalid api key"
                    }
                }
            ]
        }
    },

    {
        id: 'auth_refresh_token',
        group: '인증',
        groupIcon: 'fa-key',
        opaCode: 'OPA2_002',
        name: 'Access Token 갱신',
        method: 'POST',
        path: '/v2.0/api_auth/refresh_token',
        description: 'Refresh Token을 사용하여 만료된 Access Token을 갱신합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'refresh_token', description: 'Access Token 갱신을 위한 Refresh Token', required: true, default: '' },
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "oauth_token": {
                    "expires_in": "number",
                    "token_type": "string",
                    "refresh_token": "string",
                    "access_token": "string"
                }
            },
            errors: [
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: {
                        "code": "4010001",
                        "ErrorMessage": "Invalid or expired token."
                    }
                },
                {
                    title: 'Access Token 클레임 오류 401 Unauthorized (4010001)',
                    body: {
                        "code": "4010001",
                        "ErrorMessage": "The access_token claim is invalid."
                    }
                },
                {
                    title: 'Refresh Token 오류 400 Bad Request (4010002)',
                    body: {
                        "code": "4010002",
                        "ErrorMessage": "The refresh_token is invalid."
                    }
                },
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }
                },
                {
                    title: 'Refresh Token 만료 (4010006)',
                    body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }
                }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // 문서
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'doc_info',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_003',
        name: '문서 정보 조회',
        method: 'GET',
        path: '/v2.0/api/documents/{document_id}',
        description: '특정 문서의 상세 정보를 조회합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '조회할 문서 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'include_fields', description: '필드 정보 포함', required: false, default: '' },
            { key: 'include_histories', description: '문서 이력 포함', required: false, default: '' },
            { key: 'include_previous_status', description: '이전 단계 정보 포함', required: false, default: '' },
            { key: 'include_next_status', description: '다음 단계 정보 포함', required: false, default: '' },
            { key: 'include_external_token', description: '사용자 Token 포함', required: false, default: '' },
            { key: 'include_detail_template_info', description: '상세 템플릿 정보 포함', required: false, default: '' },
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "id": "string",
                "document_number": "string",
                "template": {
                    "id": "string",
                    "name": "string"
                },
                "document_name": "string",
                "creator": {
                    "recipient_type": "string",
                    "id": "string"
                },
                "created_date": "number",
                "last_editor": {
                    "recipient_type": "string",
                    "id": "string"
                },
                "updated_date": "number",
                "current_status": {
                    "status_type": "string",
                    "status_doc_type": "string",
                    "status_doc_detail": "string",
                    "step_type": "string",
                    "step_index": "string",
                    "step_name": "string",
                    "step_recipients": [
                        { "recipient_type": "string", "email": "string" }
                    ],
                    "step_group": "number",
                    "expired_date": "number",
                    "_expired": "boolean"
                },
                "fields": [],
                "next_status": [
                    {
                        "step_type": "string",
                        "step_name": "string",
                        "step_recipients": [],
                        "execute_date": "number",
                        "status_type": "string",
                        "step_group": "number"
                    }
                ],
                "previous_status": [
                    {
                        "step_type": "string",
                        "step_name": "string",
                        "action_type": "string",
                        "executor": { "id": "string" },
                        "executed_date": "number",
                        "step_group": "number"
                    }
                ],
                "histories": [],
                "recipients": [
                    {
                        "name": "string",
                        "id": "string",
                        "token_id": "string",
                        "sms_template_index": "number"
                    }
                ],
                "detail_template_info": []
            },
            errors: [
                {
                    title: '유효하지 않은 API Key (4030001)',
                    body: { "code": "4030001", "ErrorMessage": "invalid api key" }
                },
                {
                    title: '삭제된 문서 (4000006)',
                    body: { "code": "4000006", "ErrorMessage": "The document has been deleted." }
                },
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }
                },
                {
                    title: '문서 접근 권한 없음 (4000034)',
                    body: { "code": "4000034", "ErrorMessage": "You have no access authority to the requested document." }
                },
                {
                    title: 'Refresh Token 만료 (4010006)',
                    body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }
                }
            ]
        }
    },
    {
        id: 'doc_download',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_004',
        name: '문서 파일 다운로드',
        method: 'GET',
        path: '/v2.0/api/documents/{document_id}/download_files',
        description: '완료된 문서의 PDF 및 감사 추적 파일을 다운로드합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '다운로드할 문서 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'file_type', description: '파일 유형 (document,audit_trail)', required: false, default: 'document,audit_trail' },
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: '존재하지 않는 문서 (4000004)',
                    body: { "code": "4000004", "ErrorMessage": "The document does not exist." }
                },
                {
                    title: '감사추적 미생성 — 문서 미완료 (2020001)',
                    body: { "code": "2020001", "ErrorMessage": "The audit trail will be generated when the document is completed." }
                },
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }
                },
                {
                    title: 'Refresh Token 만료 (4010006)',
                    body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }
                }
            ]
        }
    },
    {
        id: 'doc_create_internal',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_005',
        name: '새 문서 작성 (내부)',
        method: 'POST',
        path: '/v2.0/api/documents',
        description: '내부 멤버용 템플릿으로 새 문서를 작성합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'template_id', description: '사용할 템플릿 ID', required: true, default: '' },
        ],
        defaultBody: {
            document: {
                document_name: "",
                select_group_name: "",
                fields: [
                    { id: "", value: "" }
                ],
                recipients: [
                    {
                        step_type: "",
                        use_mail: null,
                        use_sms: null,
                        member: {
                            name: "",
                            id: "",
                            sms: { country_code: "", phone_number: "" }
                        },
                        business_num: "",
                        auth: {
                            password: "",
                            password_hint: "",
                            valid: { day: null, hour: null }
                        }
                    }
                ],
                notification: [
                    {
                        email: "",
                        sms: { country_code: "", phone_number: "" },
                        name: "",
                        auth: {
                            valid: { day: null, hour: null },
                            password: "",
                            password_hint: "",
                            mobile_verification: null
                        }
                    }
                ],
                comment: ""
            }
        },
        exampleResponse: {
            success: {
                document: {
                    document_name: "string",
                    select_group_name: "string",
                    fields: [
                        { id: "string", value: "string" }
                    ],
                    recipients: [
                        {
                            step_type: "string",
                            use_mail: "boolean",
                            use_sms: "boolean",
                            member: {
                                name: "string",
                                id: "string",
                                sms: { country_code: "string", phone_number: "string" }
                            },
                            business_num: "string",
                            auth: {
                                password: "string",
                                password_hint: "string",
                                valid: { day: "number", hour: "number" }
                            }
                        },
                        {
                            step_type: "string",
                            use_mail: "boolean",
                            use_sms: "boolean",
                            group: { id: "string" }
                        }
                    ],
                    notification: [
                        {
                            email: "string",
                            sms: { country_code: "string", phone_number: "string" },
                            name: "string",
                            auth: {
                                valid: { day: "number", hour: "number" },
                                password: "string",
                                password_hint: "string",
                                mobile_verification: "boolean"
                            }
                        }
                    ],
                    comment: "string"
                }
            },
            errors: [
                {
                    title: '워크플로우 설정 불일치 (4000012)',
                    body: {
                        "code": "4000012",
                        "ErrorMessage": "The next_steps set by the user is inconsistent with the template's workflow settings."
                    }
                },
                {
                    title: '필수 입력값 누락 (4000001)',
                    body: { "code": "4000001", "ErrorMessage": "Required input value not found. " }
                },
                {
                    title: '유효하지 않은 회사 (4000005)',
                    body: { "code": "4000005", "ErrorMessage": "Invalid company." }
                },
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }
                },
                {
                    title: 'Refresh Token 만료 (4010006)',
                    body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }
                }
            ]
        }
    },
    {
        id: 'doc_download_attach',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_006',
        name: '문서 첨부 파일 다운로드',
        method: 'GET',
        path: '/v2.0/api/documents/{document_id}/download_attach_files',
        description: '문서에 첨부된 파일을 다운로드합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '첨부파일을 포함한 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: '존재하지 않는 문서 (4000004)',
                    body: { "code": "4000004", "ErrorMessage": "The document does not exist." }
                },
                {
                    title: '템플릿 없음 (4000046)',
                    body: { "code": "4000046", "ErrorMessage": "There is no template." }
                },
                {
                    title: '첨부 파일 없음 (4000065)',
                    body: { "code": "4000065", "ErrorMessage": "Failed to get the resource." }
                },
                {
                    title: '유효하지 않거나 만료된 토큰 (4010001)',
                    body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }
                },
                {
                    title: 'Refresh Token 만료 (4010006)',
                    body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }
                }
            ]
        }
    },
    {
        id: 'doc_create_external',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_007',
        name: '새 문서 작성 (외부)',
        method: 'POST',
        path: '/v2.0/api/documents/external',
        description: '외부자용 템플릿으로 새 문서를 작성합니다. Authorization 헤더에 Company API Key(Base64 인코딩)를 Bearer 토큰으로 사용합니다.',
        requiresAuth: false,
        pathParams: [],
        queryParams: [
            { key: 'company_id', description: '회사 ID', required: true, default: '' },
            { key: 'template_id', description: '외부용 템플릿 ID', required: true, default: '' },
        ],
        defaultHeaders: [
            { key: 'Authorization', value: 'Bearer {base64_encoded_api_key}', description: 'Company API Key를 Base64 인코딩한 값 (인증 패널의 Access Token이 아닌 회사 API Key 사용)' }
        ],
        defaultBody: {
            document: {
                document_name: "",
                select_group_name: "",
                fields: [
                    { id: "", value: "" }
                ],
                recipients: [
                    {
                        step_type: "",
                        use_mail: null,
                        use_sms: null,
                        member: {
                            name: "",
                            id: "",
                            sms: { country_code: "", phone_number: "" }
                        },
                        business_num: "",
                        auth: {
                            password: "",
                            password_hint: "",
                            valid: { day: null, hour: null }
                        }
                    }
                ],
                notification: [
                    {
                        email: "",
                        sms: { country_code: "", phone_number: "" },
                        name: "",
                        auth: {
                            valid: { day: null, hour: null },
                            password: "",
                            password_hint: "",
                            mobile_verification: null
                        }
                    }
                ],
                comment: ""
            }
        },
        exampleResponse: {
            success: {
                template_id: "string",
                document: {
                    id: "string",
                    document_name: "string",
                    document_status: "string"
                },
                recipients: [
                    {
                        member: {
                            name: "string",
                            id: "string",
                            sms: {
                                country_code: "string",
                                phone_number: "string"
                            },
                            token_id: "string",
                            sms_template_index: "number"
                        }
                    }
                ]
            },
            errors: [
                {
                    title: '유효하지 않은 회사 (4000005)',
                    body: { "code": "4000005", "ErrorMessage": "Invalid company." }
                },
                {
                    title: '필수 입력값 누락 (4000001)',
                    body: { "code": "4000001", "ErrorMessage": "Required input value not found. " }
                },
                {
                    title: '템플릿 없음 (4000046)',
                    body: { "code": "4000046", "ErrorMessage": "There is no template." }
                },
                {
                    title: 'URL로 문서작성이 체크되어 있지 않은 템플릿 (4000115)',
                    body: { "code": "4000115", "ErrorMessage": "This domain cannot be accessed." }
                },
                {
                    title: '워크플로우 설정 불일치 (4000012)',
                    body: { "code": "4000012", "ErrorMessage": "The next_steps set by the user is inconsistent with the template's workflow settings." }
                }
            ]
        }
    },
    {
        id: 'doc_list',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_008',
        name: '문서 목록 조회',
        method: 'POST',
        path: '/v2.0/api/list_document',
        description: '조건에 맞는 문서 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'include_fields', description: '필드 정보 포함', required: false, default: '' },
            { key: 'include_histories', description: '문서 이력 포함', required: false, default: '' },
            { key: 'include_previous_status', description: '이전 단계 정보 포함', required: false, default: '' },
            { key: 'include_next_status', description: '다음 단계 정보 포함', required: false, default: '' },
            { key: 'include_external_token', description: '사용자 Token 포함', required: false, default: '' },
            { key: 'include_detail_template_info', description: '상세 템플릿 정보 포함', required: false, default: '' },
        ],
        defaultBody: {
            type: '',
            title_and_content: '',
            title: '',
            content: '',
            limit: '',
            skip: '',
            start_create_date: '',
            end_create_date: '',
            start_update_date: '',
            end_update_date: ''
        },
        exampleResponse: {
            success: {
                "documents": [
                    {
                        "id": "string",
                        "document_number": "string",
                        "template": {
                            "id": "string",
                            "name": "string"
                        },
                        "document_name": "string",
                        "creator": {
                            "recipient_type": "string",
                            "id": "string",
                            "name": "string"
                        },
                        "created_date": "number",
                        "last_editor": {
                            "recipient_type": "string",
                            "id": "string",
                            "name": "string"
                        },
                        "updated_date": "number",
                        "current_status": {
                            "status_type": "string",
                            "status_doc_type": "string",
                            "status_doc_detail": "string",
                            "step_type": "string",
                            "step_index": "string",
                            "step_name": "string",
                            "step_recipients": [
                                {
                                    "recipient_type": "string",
                                    "name": "string",
                                    "email": "string"
                                }
                            ],
                            "step_group": "number",
                            "expired_date": "number",
                            "_expired": "boolean"
                        },
                        "fields": [
                            {
                                "id": "string",
                                "value": "string",
                                "type": "string"
                            }
                        ],
                        "next_status": [
                            {
                                "step_type": "string",
                                "step_name": "string",
                                "step_recipients": [],
                                "execute_date": "number",
                                "status_type": "string",
                                "step_group": "number"
                            }
                        ],
                        "previous_status": [
                            {
                                "step_type": "string",
                                "step_name": "string",
                                "action_type": "string",
                                "executor": {
                                    "id": "string",
                                    "name": "string"
                                },
                                "executed_date": "number",
                                "step_group": "number"
                            }
                        ],
                        "histories": [
                            {
                                "step_type": "string",
                                "step_name": "string",
                                "action_type": "string",
                                "executor": {
                                    "recipient_type": "string",
                                    "id": "string",
                                    "name": "string"
                                },
                                "executed_date": "number",
                                "comment": "string",
                                "sms_histories": []
                            }
                        ],
                        "recipients": [
                            {
                                "name": "string",
                                "id": "string",
                                "token_id": "string",
                                "sms_template_index": "number"
                            }
                        ],
                        "detail_template_info": []
                    }
                ],
                "total_rows": "number",
                "limit": "number",
                "skip": "number"
            },
            successEmpty: {
                "documents": [],
                "total_rows": 0,
                "limit": "number",
                "skip": "number"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '접근 권한 없음 (4030009) — 권한 없는 계정이 type:04 (문서 관리) 메뉴 조회 시 발생', body: { "code": "4030009", "ErrorMessage": "You do not have access." } }
            ]
        }
    },
    {
        id: 'doc_delete',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_009',
        name: '문서 삭제',
        method: 'DELETE',
        path: '/v2.0/api/documents',
        description: '문서를 삭제합니다. Body에 삭제할 문서 ID 배열을 포함합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'is_permanent', description: '즉시 완전 삭제 여부 (default: false)', required: false, default: '' }
        ],
        defaultBody: { document_ids: [""] },
        exampleResponse: {
            success: {
                "result": {
                    "success_result": ["string"],
                    "fail_result": []
                },
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '요청 Body 없음 (400)', body: { "code": "400", "ErrorMessage": "Required request body is missing" } },
                { title: '선택된 문서 없음 (4000004)', body: { "code": "4000004", "ErrorMessage": "No document selected." } },
                { title: '문서 삭제 실패 — 존재하지 않는 문서 ID (HTTP 200, fail_result 포함)', body: { "result": { "success_result": [], "fail_result": [ { "document_id": "string", "code": "4000004", "message": "The document does not exist." } ] }, "code": "-1", "message": "Completed.", "status": "200" } }
            ]
        }
    },
    {
        id: 'doc_re_request',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_014',
        name: '수신자 문서 재요청',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/re_request_outsider',
        description: '외부 수신자에게 문서 서명을 재요청합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '재요청할 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            input: {
                next_steps: [
                    {
                        step_type: '',
                        step_seq: '',
                        recipients: [
                            {
                                member: { name: '', id: '', sms: { country_code: '', phone_number: '' } },
                                use_mail: null,
                                use_sms: null,
                                auth: {
                                    password: '',
                                    password_hint: '',
                                    valid: { day: null, hour: null }
                                }
                            }
                        ],
                        comment: ''
                    }
                ]
            }
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "Completed.",
                "recipients": [
                    {
                        "step_seq": "string",
                        "name": "string",
                        "id": "string",
                        "sms": {
                            "country_code": "string",
                            "phone_number": "string"
                        },
                        "token_id": "string",
                        "sms_template_index": "number"
                    }
                ]
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '워크플로우 설정 불일치 (4000012)', body: { "code": "4000012", "ErrorMessage": "The next_steps set by the user is inconsistent with the template's workflow settings." } },
                { title: '필수 입력값 누락 (4000001)', body: { "code": "4000001", "ErrorMessage": "Required input value not found. " } }
            ]
        }
    },
    {
        id: 'doc_mass_create',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_016',
        name: '문서 일괄 작성',
        method: 'POST',
        path: '/v2.0/api/forms/mass_documents',
        description: '단일 템플릿으로 여러 문서를 일괄 작성합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'template_id', description: '사용할 템플릿 ID', required: true, default: '' },
        ],
        defaultBody: {
            documents: [
                {
                    document_name: '',
                    select_group_name: '',
                    fields: [
                        { id: '', value: '' }
                    ],
                    parameters: [
                        { id: '', value: '' }
                    ],
                    recipients: [
                        {
                            step_type: '',
                            use_mail: null,
                            use_sms: null,
                            member: {
                                name: '',
                                id: '',
                                sms: { country_code: '', phone_number: '' }
                            },
                            group: { id: '' },
                            auth: {
                                password: '',
                                password_hint: '',
                                valid: { day: null, hour: null }
                            }
                        }
                    ]
                }
            ],
            comment: ''
        },
        exampleResponse: {
            success: {
                "result": {
                    "success_result": ["number"],
                    "request_id": "string",
                    "fail_result": []
                },
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '템플릿 없음 (4000046)', body: { "code": "4000046", "ErrorMessage": "There is no template." } },
                { title: '필수 입력값 누락 (4000001)', body: { "code": "4000001", "ErrorMessage": "Required input value not found." } }
            ]
        }
    },
    {
        id: 'doc_mass_multi_create',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_021',
        name: '문서 일괄 작성 (멀티)',
        method: 'POST',
        path: '/v2.0/api/forms/mass_multi_documents',
        description: '여러 템플릿으로 문서를 일괄 작성합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            documents: [
                {
                    template_id: '',
                    select_group_name: '',
                    document_name: '',
                    fields: [{ id: '', value: '' }],
                    parameters: [{ id: '', value: '' }],
                    recipients: [
                        {
                            step_type: '',
                            use_mail: null,
                            use_sms: null,
                            member: {
                                name: '',
                                id: '',
                                sms: { country_code: '', phone_number: '' }
                            },
                            auth: {
                                password: '',
                                password_hint: '',
                                valid: { day: null, hour: null }
                            }
                        }
                    ]
                }
            ],
            comment: ''
        },
        exampleResponse: {
            success: {
                "result": {
                    "success_result": ["number"],
                    "request_id": "string",
                    "fail_result": []
                },
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '필수 입력값 누락 (4000001)', body: { "code": "4000001", "ErrorMessage": "Required input value not found." } },
                { title: 'template_id 누락 (400)', body: { "code": "400", "ErrorMessage": "Required String parameter 'template_id' is not present" } }
            ]
        }
    },
    {
        id: 'doc_draft_send',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_031',
        name: '초안 문서 다음 단계 전송',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/send',
        description: '임시 저장(초안) 상태의 문서를 다음 단계로 전송합니다. 비정형 문서(내 파일로 문서 작성)만 가능합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '전송할 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            comment: '',
            remove_company_stamp_mark: null
        },
        exampleResponse: {
            success: {
                "document_title": "string",
                "document_status": "string",
                "document_id": "string"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '존재하지 않는 문서 (4000004)', body: { "code": "4000004", "ErrorMessage": "The document does not exist." } },
                { title: '초안 상태가 아닌 문서 (4000180)', body: { "code": "4000180", "ErrorMessage": "The document status is not draft." } }
            ]
        }
    },
    {
        id: 'doc_cancel',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_042',
        name: '문서 취소',
        method: 'POST',
        path: '/v2.0/api/documents/cancel',
        description: '진행 중인 문서를 취소합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: { input: { document_ids: [] } },
        exampleResponse: {
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'doc_multi_download',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_040',
        name: '문서 파일 일괄 다운로드',
        method: 'POST',
        path: '/v2.0/api/documents/download_multi_files',
        description: '여러 문서 파일을 한 번에 다운로드합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: { document_ids: [], file_type: ['document', 'audit_trail'] },
        exampleResponse: {
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'doc_complete_token',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_045',
        name: '완료 토큰 기한 연장',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/refresh_complete_token',
        description: '완료된 문서의 외부 공유 토큰 유효기간을 연장합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '완료된 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: { step_seq: [] },
        exampleResponse: {
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // 템플릿
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'template_list',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: 'OPA2_015',
        name: '작성 가능한 템플릿 목록',
        method: 'GET',
        path: '/v2.0/api/forms',
        description: '작성 가능한 템플릿(양식) 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "total_rows": "number",
                "templates": [
                    {
                        "form_id": "string",
                        "name": "string",
                        "version": "string",
                        "abbreviation": "string",
                        "start_write_date": "number",
                        "end_write_date": "number",
                        "unlimited": "boolean",
                        "create_id": "string",
                        "create_name": "string",
                        "create_date": "number",
                        "update_id": "string",
                        "update_name": "string",
                        "update_date": "number",
                        "owner_id": "string",
                        "owner_name": "string",
                        "category": "string",
                        "keyword": "string",
                        "desc": "string",
                        "favorite": "boolean",
                        "use_document_numbering": "boolean",
                        "document_numbering_rule_id": "string",
                        "use_ai": "boolean",
                        "is_release": "boolean",
                        "is_update": "boolean",
                        "is_sample": "boolean",
                        "market": null,
                        "file": {
                            "form_image_id": "string",
                            "form_files": [
                                {
                                    "type": "string",
                                    "ozr_id": "string",
                                    "ext": "string",
                                    "alias": "string",
                                    "file_id": "string"
                                }
                            ]
                        },
                        "enabled": "boolean",
                        "form_modify_auth": "boolean",
                        "formDeployInfo": null,
                        "last_release_id": "string",
                        "last_release_name": null,
                        "formPermission": null,
                        "availableDeleteDraft": "boolean"
                    }
                ]
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'template_delete',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: 'OPA2_024',
        name: '템플릿 삭제',
        method: 'DELETE',
        path: '/v2.0/api/forms/{form_id}',
        description: '템플릿을 삭제합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'form_id', description: '삭제할 템플릿 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '템플릿 없음 (4000046)', body: { "code": "4000046", "ErrorMessage": "There is no template." } },
                { title: '접근 권한 없음 (4030009)', body: { "code": "4030009", "ErrorMessage": "You do not have access." } }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // 멤버
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'member_list',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: 'OPA2_010',
        name: '멤버 목록 조회',
        method: 'GET',
        path: '/v2.0/api/members',
        description: '회사에 소속된 멤버 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'member_all', description: '전체 멤버 조회 여부 (default: false)', required: false, default: '' },
            { key: 'include_field', description: '구성원 커스텀 필드 포맷 정보 포함 여부 (default: false)', required: false, default: '' },
            { key: 'include_delete', description: '탈퇴 멤버 조회 여부 (default: false)', required: false, default: '' },
            { key: 'eb_name_search', description: '이름 또는 계정 ID로 구성원 검색', required: false, default: '' },
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "members": [
                    {
                        "id": "string",
                        "account_id": "string",
                        "name": "string",
                        "department": "string",
                        "position": "string",
                        "create_date": "number",
                        "enabled": "boolean",
                        "isRefused": "boolean",
                        "isExpired": "boolean",
                        "isInvited": "boolean",
                        "isWithdrawal": "boolean",
                        "contact": {
                            "number": "string",
                            "tel": "string",
                            "email": "string",
                            "country_id": "string"
                        },
                        "role": ["string"],
                        "group": ["string"],
                        "fields": [],
                        "deleted": "boolean"
                    }
                ],
                "format": {
                    "_id": "string",
                    "_rev": "string",
                    "type": "string",
                    "format_type": "string",
                    "format_datas": [
                        {
                            "field_key": "string",
                            "field_type": "string",
                            "field_value": "string",
                            "field_file": "string",
                            "default_value": "string",
                            "deleted": "boolean"
                        }
                    ]
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'member_create',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: 'OPA2_011',
        name: '멤버 추가',
        method: 'POST',
        path: '/v2.0/api/members',
        description: '새 멤버를 추가합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'mailOption', description: '초대 메일 발송 여부 (true/false)', required: false, default: 'false' },
        ],
        defaultBody: {
            account: {
                id: '',
                password: '',
                first_name: '',
                contact: {
                    tel: '',
                    number: '',
                    country_number: '+82'
                },
                department: '',
                position: '',
                agreement: {
                    marketing: null
                },
                role: [],
                external_sso_info: {
                    uuid: '',
                    idp_name: '',
                    account_id: ''
                }
            }
        },
        exampleResponse: {
            success: {
                "company_id": "string",
                "member": {
                    "name": "string",
                    "id": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '이미 사용 중인 ID (4000135)', body: { "code": "4000135", "ErrorMessage": "This ID is already taken." } },
                { title: '비밀번호 규칙 미충족 (4000255) — 대문자+소문자+숫자+특수문자 모두 포함 10자리 이상 필요', body: { "code": "4000255", "ErrorMessage": "Password validation failed." } }
            ]
        }
    },
    {
        id: 'member_update',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: 'OPA2_012',
        name: '멤버 수정',
        method: 'PATCH',
        path: '/v2.0/api/members/{member_id}',
        description: '멤버 정보를 수정합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'member_id', description: '수정할 멤버 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            account: {
                id: '',
                name: '',
                enabled: true,
                contact: { number: '', tel: '' },
                department: '',
                position: '',
                role: []
            }
        },
        exampleResponse: {
            success: {
                "company_id": "string",
                "member": {
                    "name": "string",
                    "id": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'member_delete',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: 'OPA2_013',
        name: '멤버 삭제',
        method: 'DELETE',
        path: '/v2.0/api/members/{member_id}',
        description: '멤버를 삭제합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'member_id', description: '삭제할 멤버 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '존재하지 않는 멤버 (4000149)', body: { "code": "4000149", "ErrorMessage": "No such member exists." } }
            ]
        }
    },
    {
        id: 'member_bulk_add',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: 'OPA2_030',
        name: '멤버 일괄 추가',
        method: 'POST',
        path: '/v2.0/api/list_members',
        description: '여러 멤버를 한 번에 추가합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'mailOption', description: '멤버 생성 시 이메일 알림 전송 여부 (기본값: true)', required: false, default: '' }
        ],
        defaultBody: [
            {
                id: '',
                password: '',
                name: '',
                contact: { tel: '', number: '', country_number: '' },
                department: '',
                position: '',
                agreement: { marketing: null },
                role: [''],
                external_sso_info: { uuid: '', idp_name: '', account_id: '' }
            }
        ],
        exampleResponse: {
            success: {
                "company_id": "string",
                "members": [
                    { "name": "string", "id": "string", "success": "boolean" }
                ]
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                {
                    title: '멤버 추가 실패 — 중복 계정 또는 비밀번호 규칙 미충족 (HTTP 200, success: false)',
                    body: {
                        "company_id": "string",
                        "members": [
                            { "name": "string", "id": "string", "success": false }
                        ]
                    }
                }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // 그룹
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'group_list',
        group: '그룹',
        groupIcon: 'fa-layer-group',
        opaCode: 'OPA2_017',
        name: '그룹 목록 조회',
        method: 'GET',
        path: '/v2.0/api/groups',
        description: '회사의 그룹 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'include_member', description: '멤버 정보 포함 여부 (default: false)', required: false, default: '' },
            { key: 'include_field', description: '그룹 사용자 정의 필드 포맷 정보 포함 여부 (default: false)', required: false, default: '' },
            { key: 'eb_name_search', description: '그룹 이름 검색 (포함 문자)', required: false, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "format": {
                    "_id": "string",
                    "_rev": "string",
                    "type": "string",
                    "format_type": "string",
                    "format_datas": [
                        {
                            "field_key": "string",
                            "field_type": "string",
                            "field_value": "string",
                            "field_file": "string",
                            "default_value": "string",
                            "deleted": "boolean"
                        }
                    ]
                },
                "groups": [
                    {
                        "id": "string",
                        "name": "string",
                        "description": "string",
                        "create_date": "number",
                        "members": [
                            {
                                "id": "string",
                                "account_id": "string",
                                "name": "string",
                                "create_date": "number",
                                "status": "string",
                                "contact": {
                                    "country_id": "string",
                                    "number": "string",
                                    "tel": "string"
                                },
                                "department": "string",
                                "position": "string"
                            }
                        ],
                        "fields": [
                            {
                                "u_id": "string",
                                "field_key": "string",
                                "field_value": "string",
                                "field_file": "string"
                            }
                        ]
                    }
                ]
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'group_create',
        group: '그룹',
        groupIcon: 'fa-layer-group',
        opaCode: 'OPA2_018',
        name: '그룹 추가',
        method: 'POST',
        path: '/v2.0/api/groups',
        description: '새 그룹을 추가합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            group: {
                name: '',
                description: '',
                members: ['']
            }
        },
        exampleResponse: {
            success: {
                "group": {
                    "id": "string",
                    "name": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'group_update',
        group: '그룹',
        groupIcon: 'fa-layer-group',
        opaCode: 'OPA2_019',
        name: '그룹 수정',
        method: 'PATCH',
        path: '/v2.0/api/groups/{group_id}',
        description: '그룹 정보를 수정합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'group_id', description: '수정할 그룹 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            group: {
                name: '',
                description: '',
                members: ['']
            }
        },
        exampleResponse: {
            success: {
                "group": {
                    "id": "string",
                    "name": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '존재하지 않는 그룹 (4000123)', body: { "code": "4000123", "ErrorMessage": "The group does not exist." } }
            ]
        }
    },
    {
        id: 'group_delete',
        group: '그룹',
        groupIcon: 'fa-layer-group',
        opaCode: 'OPA2_020',
        name: '그룹 삭제',
        method: 'DELETE',
        path: '/v2.0/api/groups',
        description: '그룹을 삭제합니다. Body에 삭제할 그룹 ID 배열을 포함합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: { group_ids: [''] },
        exampleResponse: {
            success: {
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '요청 Body 없음 (400)', body: { "code": "400", "ErrorMessage": "Required request body is missing" } },
                { title: '존재하지 않는 그룹 (4000011)', body: { "code": "4000011", "ErrorMessage": "The group does not exist." } }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // 회사
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'stamp_list',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_029',
        name: '회사 도장 목록 조회',
        method: 'GET',
        path: '/v2.0/api/company_stamp',
        description: '회사에 등록된 도장 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "total_rows": "number",
                "company_stamps": [
                    {
                        "id": "string",
                        "name": "string",
                        "description": "string",
                        "create_date": "number",
                        "create_id": "string",
                        "update_date": "number",
                        "update_id": "string",
                        "deleted": "boolean",
                        "stamp": {
                            "type": "string",
                            "file": "string",
                            "path": "string",
                            "ozdpi": "string"
                        },
                        "auth": {
                            "allow_all_members": "boolean",
                            "groups": [
                                {
                                    "_id": "string",
                                    "name": "string",
                                    "create_date": "number",
                                    "description": "string"
                                }
                            ],
                            "members": [
                                {
                                    "_id": "string",
                                    "account_id": "string",
                                    "first_name": "string",
                                    "create_date": "number"
                                }
                            ]
                        }
                    }
                ]
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
    {
        id: 'stamp_info',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_025',
        name: '회사 도장 정보 조회',
        method: 'GET',
        path: '/v2.0/api/company_stamp/{stamp_id}',
        description: '특정 도장의 상세 정보를 조회합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'stamp_id', description: '조회할 도장 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "id": "string",
                "name": "string",
                "description": "string",
                "create_date": "number",
                "create_id": "string",
                "update_date": "number",
                "update_id": "string",
                "deleted": "boolean",
                "stamp": {
                    "type": "string",
                    "file": "string",
                    "path": "string",
                    "ozdpi": "string"
                },
                "auth": {
                    "allow_all_members": "boolean",
                    "groups": ["string"],
                    "members": ["string"]
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '도장 없음 (4000175)', body: { "code": "4000175", "ErrorMessage": "No stamp found." } }
            ]
        }
    },
    {
        id: 'stamp_add',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_026',
        name: '회사 도장 추가',
        method: 'POST',
        path: '/v2.0/api/company_stamp',
        description: '회사에 도장을 추가합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            company_stamp: {
                name: '',
                description: '',
                stamp: {
                    path: ''
                },
                auth: {
                    groups: [''],
                    members: [''],
                    allow_all_members: null
                }
            }
        },
        exampleResponse: {
            success: {
                "company_stamp": {
                    "id": "string",
                    "name": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '중복된 도장 이름 (4000174)', body: { "code": "4000174", "ErrorMessage": "This name has already been used for another stamp." } },
                { title: '접근 권한 없음 (4030009)', body: { "code": "4030009", "ErrorMessage": "You do not have access." } }
            ]
        }
    },
    {
        id: 'stamp_update',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_027',
        name: '회사 도장 수정',
        method: 'PATCH',
        path: '/v2.0/api/company_stamp/{stamp_id}',
        description: '회사 도장 정보를 수정합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'stamp_id', description: '수정할 도장 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            company_stamp: {
                name: '',
                description: '',
                stamp: {
                    path: ''
                },
                auth: {
                    groups: [''],
                    members: [''],
                    allow_all_members: null
                }
            }
        },
        exampleResponse: {
            success: {
                "company_stamp": {
                    "id": "string",
                    "name": "string"
                }
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '접근 권한 없음 (4030009)', body: { "code": "4030009", "ErrorMessage": "You do not have access." } },
                { title: '도장 없음 (4000175)', body: { "code": "4000175", "ErrorMessage": "No stamp found." } },
                { title: '요청 Body 없음 (400)', body: { "code": "400", "ErrorMessage": "Required request body is missing" } }
            ]
        }
    },
    {
        id: 'stamp_delete',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_028',
        name: '회사 도장 삭제',
        method: 'DELETE',
        path: '/v2.0/api/company_stamp/{stamp_id}',
        description: '회사 도장을 삭제합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'stamp_id', description: '삭제할 도장 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } },
                { title: '도장 없음 (4000175)', body: { "code": "4000175", "ErrorMessage": "No stamp found." } },
                { title: '접근 권한 없음 (4030009)', body: { "code": "4030009", "ErrorMessage": "You do not have access." } }
            ]
        }
    },
    {
        id: 'company_send_pdf',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_037',
        name: '일괄 완료 문서 PDF 전송',
        method: 'POST',
        path: '/v2.0/api/companies/{company_id}/send_multiple_completed_document',
        description: '완료된 문서의 PDF를 여러 수신자에게 일괄 전송합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'company_id', description: '회사 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            input: {
                send_pdfs: [
                    {
                        document_id: '',
                        pdf_send_infos: [
                            { name: '', method: 'email', method_info: '', sms_option: {} }
                        ]
                    }
                ]
            }
        },
        exampleResponse: {
            errors: [
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." } },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." } }
            ]
        }
    },
];

// ──────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────
const DOMAINS = {
    op_saas: 'https://kr-api.eformsign.com',
    csap: 'https://www.gov-eformsign.com/Service'
};

// ──────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────
let state = {
    accessToken: '',
    authMethod: 'signature',   // 'signature' | 'bearer'
    currentEndpoint: null,
};

// 엔드포인트별 응답 캐시 { [endpointId]: { statusText, statusClass, time, size, bodyHtml } }
const responseCache = {};

function saveResponseState(epId) {
    if (!epId || !$('#responseBody').is(':visible')) return;
    responseCache[epId] = {
        statusText:  $('#statusBadge').text(),
        statusClass: $('#statusBadge').attr('class'),
        time:        $('#responseTime').text(),
        size:        $('#responseSize').text(),
        bodyHtml:    $('#responseBody').html(),
    };
}

function restoreResponseState(epId) {
    const cached = responseCache[epId];
    if (cached) {
        $('#statusBadge').text(cached.statusText).attr('class', cached.statusClass).show();
        $('#responseTime').text(cached.time);
        $('#responseSize').text(cached.size);
        $('#responseMeta').show();
        $('#responseBody').html(cached.bodyHtml).show();
        $('#responsePlaceholder').hide();
        $('#btnCopyResponse').show();
        $('#btnClearResponse').show();
    } else {
        clearResponse();
    }
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────
function getBaseUrl() {
    const env = $('#envSelect').val();
    if (env === 'custom') {
        return $('#customDomainInput').val().trim().replace(/\/+$/, '');
    }
    return DOMAINS[env] || '';
}

function methodClass(method) {
    return 'm-' + (method || 'get').toLowerCase();
}

function methodBadge(method) {
    return `<span class="m-badge ${methodClass(method)}">${method}</span>`;
}

function showToast(msg, duration = 2000) {
    const $t = $('#toast');
    $t.text(msg).addClass('show');
    setTimeout(() => $t.removeClass('show'), duration);
}

function formatJsonSyntax(json) {
    if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
    return json
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="json-key">$1</span>$2')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
        .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
        .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
        .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

// ──────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ──────────────────────────────────────────────────────────────────────────
function buildSidebar(filter = '') {
    const $list = $('#sidebarList').empty();
    const groups = {};
    API_LIST.forEach(ep => {
        if (!groups[ep.group]) groups[ep.group] = { icon: ep.groupIcon, items: [] };
        groups[ep.group].items.push(ep);
    });

    Object.entries(groups).forEach(([groupName, { icon, items }]) => {
        const filtered = filter
            ? items.filter(ep => ep.name.toLowerCase().includes(filter.toLowerCase()) || ep.path.toLowerCase().includes(filter.toLowerCase()))
            : items;
        if (!filtered.length) return;

        const groupId = 'group-' + groupName.replace(/\s+/g, '-');
        const $group = $('<div class="api-group">');
        const $header = $(`
            <div class="api-group-header" data-group="${groupId}">
                <i class="fa-solid ${icon} fa-xs"></i>
                ${groupName}
                <i class="fa-solid fa-chevron-down chevron fa-xs"></i>
            </div>`);
        const $endpoints = $(`<div class="api-group-endpoints" id="${groupId}">`);

        filtered.forEach(ep => {
            const opaBadge = ep.opaCode
                ? `<span class="opa-code">${ep.opaCode}</span>`
                : '';
            const $item = $(`
                <div class="endpoint-item" data-id="${ep.id}">
                    ${methodBadge(ep.method)}
                    ${opaBadge}
                    <span class="ep-name">${ep.name}</span>
                </div>`);
            $item.on('click', () => selectEndpoint(ep.id));
            $endpoints.append($item);
        });

        $header.on('click', function() {
            $(this).toggleClass('collapsed');
            $endpoints.toggleClass('hidden');
        });

        $group.append($header, $endpoints);
        $list.append($group);
    });
}

function selectEndpoint(id) {
    const ep = API_LIST.find(e => e.id === id);
    if (!ep) return;

    // 이전 엔드포인트 응답 저장
    if (state.currentEndpoint) {
        saveResponseState(state.currentEndpoint.id);
    }

    state.currentEndpoint = ep;

    // Sidebar highlight
    $('.endpoint-item').removeClass('active');
    $(`.endpoint-item[data-id="${id}"]`).addClass('active');

    // Show request area
    $('#emptyState').hide();
    $('#requestArea').css('display', 'flex');

    // Method & URL
    $('#methodSelect').val(ep.method);
    updateMethodStyle();
    $('#requestDesc').text(ep.description || '');

    // Build params table first, then update URL (order matters)
    buildParamsTable(ep);
    updateUrlPreview();

    // Default body
    if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('#bodyEditor').val(JSON.stringify(ep.defaultBody, null, 2));
    } else {
        $('#bodyEditor').val('');
    }

    // 탭 자동 전환: Path 파라미터 있으면 Path → Body 있으면 Body → 기본 Query
    if (ep.pathParams && ep.pathParams.length > 0) {
        $('[data-tab="path"]').click();
    } else if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('[data-tab="body"]').click();
    } else {
        $('[data-tab="query"]').click();
    }

    // Headers (auto-set Authorization if requiresAuth)
    buildHeadersTable(ep);

    updateParamsBadge();
    updateHeadersBadge();

    // 현재 엔드포인트 응답 복원 (없으면 초기화)
    $('#exampleResponsePanel').hide();
    restoreResponseState(ep.id);
    updateExampleResponseBtn(ep);
}

// ──────────────────────────────────────────────────────────────────────────
// URL PREVIEW
// ──────────────────────────────────────────────────────────────────────────
function updateUrlPreview() {
    const ep = state.currentEndpoint;
    if (!ep) return;
    const base = getBaseUrl();
    let path = ep.path;

    // Fill path params from pathBody
    $('#pathBody tr').each(function() {
        const key = $(this).find('.param-key').val();
        const val = $(this).find('.param-val').val();
        if (val) path = path.replace(`{${key}}`, val);
    });

    // Build query string from queryBody
    const qp = [];
    $('#queryBody tr').each(function() {
        const enabled = $(this).find('.param-enabled').is(':checked');
        const key = $(this).find('.param-key').val();
        const val = $(this).find('.param-val').val();
        if (enabled && key && val) qp.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    });

    let url = base + path;
    if (qp.length) url += '?' + qp.join('&');
    $('#urlInput').val(url);
}

// ──────────────────────────────────────────────────────────────────────────
// PARAMS TABLE
// ──────────────────────────────────────────────────────────────────────────
function buildParamsTable(ep) {
    // Path params
    const $pathTbody = $('#pathBody').empty();
    const pathParams = ep.pathParams || [];
    pathParams.forEach(p => {
        $pathTbody.append(makePathRow(p.key, p.default || '', p.description, p.required));
    });
    $('#pathEmptyMsg').toggle(pathParams.length === 0);

    // Query params
    const $queryTbody = $('#queryBody').empty();
    (ep.queryParams || []).forEach(p => {
        $queryTbody.append(makeQueryRow(p.key, p.default || '', p.description, p.required, true));
    });
}

function makePathRow(key = '', value = '', desc = '', required = false) {
    const $tr = $(`<tr>
        <td class="col-key">
            <input class="kv-input param-key" value="${key}" readonly>
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${value}" placeholder="값 입력"></td>
    </tr>`);
    $tr.find('.param-val').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function makeQueryRow(key = '', value = '', desc = '', required = false, enabled = true, userAdded = false) {
    const checkedAttr = enabled ? 'checked' : '';
    const keyField = userAdded
        ? `<input class="kv-input param-key" value="${key}" placeholder="키">`
        : `<input class="kv-input param-key" value="${key}" readonly>`;
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';

    const $tr = $(`<tr data-user-added="${userAdded}">
        <td class="col-check"><input type="checkbox" class="param-enabled" ${checkedAttr}></td>
        <td class="col-key">
            ${keyField}
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${value}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);

    $tr.find('.param-val, .param-key').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    $tr.find('.param-enabled').on('change', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function addQueryRow() {
    $('#queryBody').append(makeQueryRow('', '', '', false, true, true));
    updateParamsBadge();
}

function removeRow(btn) {
    $(btn).closest('tr').remove();
    updateUrlPreview();
    updateParamsBadge();
}

function updateParamsBadge() {
    // Path 배지: 값 입력 여부와 무관하게 존재하는 파라미터 수
    $('#pathBadge').text($('#pathBody tr').length);

    let queryCount = 0;
    $('#queryBody tr').each(function() {
        if ($(this).find('.param-enabled').is(':checked') && $(this).find('.param-key').val()) queryCount++;
    });
    $('#queryBadge').text(queryCount);
}

// ──────────────────────────────────────────────────────────────────────────
// HEADERS TABLE
// ──────────────────────────────────────────────────────────────────────────
function buildHeadersTable(ep) {
    const $tbody = $('#headersBody').empty();
    // Always add Content-Type
    $tbody.append(makeHeaderRow('Content-Type', 'application/json', false));
    // API별 defaultHeaders (e.g. OPA2_001)
    if (ep && ep.defaultHeaders) {
        ep.defaultHeaders.forEach(h => {
            const val = h.autoFill ? h.autoFill() : (h.value || '');
            $tbody.append(makeHeaderRow(h.key, val, false, h.description));
        });
    }
    // Add Authorization if required
    if (ep && ep.requiresAuth) {
        const token = state.accessToken ? `Bearer ${state.accessToken}` : '';
        $tbody.append(makeHeaderRow('Authorization', token, false));
    }
    updateHeadersBadge();
}

function makeHeaderRow(key = '', value = '', userAdded = true, description = '') {
    const readonlyKey = !userAdded ? 'readonly' : '';
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';
    const descHtml = description ? `<div class="param-desc">${description}</div>` : '';
    const $tr = $(`<tr data-user-added="${userAdded}">
        <td class="col-check"><input type="checkbox" class="header-enabled" checked></td>
        <td class="col-key">
            <input class="kv-input header-key" value="${key}" ${readonlyKey} placeholder="키">
            ${descHtml}
        </td>
        <td class="col-value"><input class="kv-input header-val" value="${value}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);
    $tr.find('.header-val, .header-key').on('input', updateHeadersBadge);
    $tr.find('.header-enabled').on('change', updateHeadersBadge);
    return $tr;
}

function addHeaderRow() {
    $('#headersBody').append(makeHeaderRow());
    updateHeadersBadge();
}

function updateHeadersBadge() {
    let count = 0;
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked') && $(this).find('.header-key').val()) count++;
    });
    $('#headersBadge').text(count);
}

// ──────────────────────────────────────────────────────────────────────────
// BODY EDITOR
// ──────────────────────────────────────────────────────────────────────────
function formatBody() {
    const raw = $('#bodyEditor').val().trim();
    if (!raw) return;
    try {
        $('#bodyEditor').val(JSON.stringify(JSON.parse(raw), null, 2));
    } catch { showToast('JSON 형식이 올바르지 않습니다', 2000); }
}

function clearBody() {
    $('#bodyEditor').val('');
}

// ──────────────────────────────────────────────────────────────────────────
// METHOD STYLE
// ──────────────────────────────────────────────────────────────────────────
function updateMethodStyle() {
    const m = $('#methodSelect').val().toLowerCase();
    const el = $('#methodSelect')[0];
    el.className = 'method-badge-select method-' + m;
}

// ──────────────────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────────────────
async function getAccessToken() {
    const execTime = Date.now();
    const apiKey = $('#apiKey').val().trim();
    const secretKey = $('#secretKey').val().trim();
    const memberId = $('#userId').val().trim();
    const domain = getBaseUrl();

    if (!domain) { showToast('환경을 선택하거나 도메인을 입력해주세요'); return; }
    if (!apiKey || !secretKey || !memberId) { showToast('API Key, 비밀 키, User ID를 모두 입력해주세요'); return; }

    $('#btnGetToken').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 발급 중...');

    let signature;
    if (state.authMethod === 'signature') {
        try {
            const keyObj = KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(secretKey);
            const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
            sig.init(keyObj);
            sig.updateString(execTime.toString());
            signature = sig.sign();
        } catch (e) {
            showToast('서명 생성 오류: ' + e.message, 3000);
            $('#btnGetToken').prop('disabled', false).html('<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급');
            return;
        }
    } else {
        signature = 'Bearer ' + secretKey;
    }

    const url = `${domain}/v2.0/api_auth/access_token`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + btoa(apiKey),
                'eformsign_signature': signature
            },
            body: JSON.stringify({ execution_time: execTime, member_id: memberId })
        });
        const data = await res.json();
        if (data.oauth_token && data.oauth_token.access_token) {
            state.accessToken = data.oauth_token.access_token;
            updateAuthUI();
            // Auto-update Authorization header in current request if open
            $('#headersBody tr').each(function() {
                const key = $(this).find('.header-key').val();
                if (key === 'Authorization') {
                    $(this).find('.header-val').val(`Bearer ${state.accessToken}`);
                }
            });
            showToast('토큰이 발급되었습니다');
        } else {
            showToast('토큰 발급 실패: ' + JSON.stringify(data), 3000);
        }
    } catch (e) {
        showToast('요청 오류: ' + e.message, 3000);
    }
    $('#btnGetToken').prop('disabled', false).html('<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급');
}

function updateAuthUI() {
    if (state.accessToken) {
        const short = state.accessToken.substring(0, 40) + '...';
        $('#tokenDisplay').text(short).addClass('has-token');
        $('#authStatusBadge').text('토큰 보유').removeClass('no-token').addClass('has-token');
    } else {
        $('#tokenDisplay').text('토큰을 발급받아 주세요').removeClass('has-token');
        $('#authStatusBadge').text('토큰 없음').removeClass('has-token').addClass('no-token');
    }
}

// ──────────────────────────────────────────────────────────────────────────
// SEND REQUEST
// ──────────────────────────────────────────────────────────────────────────
async function sendRequest(forceDownload = false) {
    const url = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();
    if (!url) { showToast('URL이 비어있습니다'); return; }
    $('#sendDropdownMenu').removeClass('open');

    // Build headers
    const headers = {};
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked')) {
            const k = $(this).find('.header-key').val().trim();
            const v = $(this).find('.header-val').val().trim();
            if (k) headers[k] = v;
        }
    });

    // Build body
    let body = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const raw = $('#bodyEditor').val().trim();
        if (raw) {
            try { body = raw; JSON.parse(raw); } // validate
            catch { showToast('Body의 JSON 형식이 올바르지 않습니다'); return; }
        }
    }

    $('#btnSend').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i>');
    clearResponse();
    $('#responsePlaceholder').show().find('p').text('요청 전송 중...');

    const startTime = Date.now();
    try {
        const opts = { method, headers };
        if (body !== undefined) opts.body = body;

        const res = await fetch(url, opts);
        const elapsed = Date.now() - startTime;
        const contentType = res.headers.get('Content-Type') || '';

        // Status badge (공통)
        const statusClass = res.status >= 500 ? 'status-5xx'
            : res.status >= 400 ? 'status-4xx'
            : res.status >= 300 ? 'status-3xx' : 'status-2xx';
        $('#statusBadge').text(`${res.status} ${res.statusText}`).attr('class', `status-badge ${statusClass}`).show();
        $('#responseMeta').show();
        $('#responseTime').text(`${elapsed}ms`);
        $('#btnClearResponse').show();
        $('#responsePlaceholder').hide();

        // 파일 다운로드 처리: PDF/ZIP 응답이거나 Send and Download 선택 시
        const isFileResponse = res.ok && (contentType.includes('application/pdf') || contentType.includes('application/zip'));
        if (isFileResponse || (forceDownload && res.ok)) {
            const blob = await res.blob();

            // 파일 확장자 결정
            let ext = '.bin';
            if (contentType.includes('application/pdf')) ext = '.pdf';
            else if (contentType.includes('application/zip')) ext = '.zip';
            else if (contentType.includes('application/json')) ext = '.json';
            else if (contentType.includes('text/')) ext = '.txt';
            const isZip = ext === '.zip';

            // 파일명 결정: Content-Disposition → document_id → 기본값
            let filename = 'download' + ext;
            const disposition = res.headers.get('Content-Disposition') || '';
            // RFC 5987: filename*=UTF-8''encoded-name 우선 처리
            const rfc5987Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;\s]+)/i);
            const plainMatch   = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
            if (rfc5987Match) {
                filename = decodeURIComponent(rfc5987Match[1]) || filename;
            } else if (plainMatch) {
                filename = (plainMatch[1] || plainMatch[2] || '').trim() || filename;
            } else {
                const docId = $('#pathBody tr').first().find('.param-val').val();
                if (docId) filename = docId + ext;
            }

            // 다운로드 트리거
            const objectUrl = URL.createObjectURL(blob);
            const $a = $('<a>').attr({ href: objectUrl, download: filename }).appendTo('body');
            $a[0].click();
            $a.remove();
            URL.revokeObjectURL(objectUrl);

            $('#responseSize').text(formatBytes(blob.size));
            $('#responseBody').show().text(
                `파일 다운로드 완료\n` +
                `파일명: ${filename}\n` +
                `형식: ${isZip ? (state.currentEndpoint && state.currentEndpoint.id === 'doc_download_attach' ? 'ZIP (첨부 파일)' : 'ZIP (문서 + 감사추적 파일)') : contentType || ext}\n` +
                `크기: ${formatBytes(blob.size)}\n` +
                `Content-Type: ${contentType}`
            );
            showToast(`${filename} 다운로드 완료`);

        } else {
            // 일반 텍스트 / JSON 응답 처리
            const text = await res.text();
            let parsed;
            try { parsed = JSON.parse(text); } catch { parsed = null; }

            $('#responseSize').text(formatBytes(text.length));
            $('#btnCopyResponse').show();

            const $pre = $('#responseBody').show();
            if (parsed !== null) {
                $pre.html(formatJsonSyntax(JSON.stringify(parsed, null, 2)));
            } else {
                $pre.text(text || '(응답 없음)');
            }
        }

    } catch (e) {
        $('#responsePlaceholder').show().find('p').text('요청 실패: ' + e.message);
        showToast('요청 실패: ' + e.message, 3000);
    }

    $('#btnSend').prop('disabled', false).html('<i class="fa-solid fa-paper-plane fa-sm"></i> Send');
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ──────────────────────────────────────────────────────────────────────────
// RESPONSE UTILITIES
// ──────────────────────────────────────────────────────────────────────────
function copyResponse() {
    const text = $('#responseBody').text();
    navigator.clipboard.writeText(text).then(() => showToast('응답이 복사되었습니다'));
}

function clearResponse() {
    $('#statusBadge').hide();
    $('#responseMeta').hide();
    $('#btnCopyResponse').hide();
    $('#btnClearResponse').hide();
    $('#responseBody').hide().html('');
    $('#exampleResponsePanel').hide();
    $('#responsePlaceholder').show().find('p').text('요청을 보내면 응답이 여기에 표시됩니다');
    if (state.currentEndpoint) {
        delete responseCache[state.currentEndpoint.id];
    }
}

function toggleExampleResponse() {
    const $panel = $('#exampleResponsePanel');
    const $placeholder = $('#responsePlaceholder');
    const $body = $('#responseBody');

    if ($panel.is(':visible')) {
        $panel.hide();
        if (!$body.is(':visible')) $placeholder.show();
    } else {
        $placeholder.hide();
        $panel.show();
    }
}

function updateExampleResponseBtn(ep) {
    if (ep && ep.exampleResponse) {
        const ex = ep.exampleResponse;
        let html = '';

        if (ex.success) {
            html += `
                <div style="padding:6px 20px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:0.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:5px;">
                    <i class="fa-solid fa-circle-check fa-xs"></i> 성공 응답 (200)
                </div>
                <pre class="response-pre">${formatJsonSyntax(JSON.stringify(ex.success, null, 2))}</pre>`;
        }

        if (ex.successEmpty) {
            html += `
                <div style="padding:6px 20px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:0.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:5px;">
                    <i class="fa-solid fa-circle-check fa-xs"></i> 성공 응답 — 조회 결과 없음 (200)
                </div>
                <pre class="response-pre">${formatJsonSyntax(JSON.stringify(ex.successEmpty, null, 2))}</pre>`;
        }

        if (ex.errors && ex.errors.length) {
            ex.errors.forEach(err => {
                html += `
                    <div style="padding:6px 20px;background:#fef2f2;border-top:1px solid #fecaca;border-bottom:1px solid #fecaca;font-size:0.78rem;font-weight:700;color:#b91c1c;display:flex;align-items:center;gap:5px;">
                        <i class="fa-solid fa-circle-xmark fa-xs"></i> 실패 응답 — ${err.title}
                    </div>
                    <pre class="response-pre">${formatJsonSyntax(JSON.stringify(err.body, null, 2))}</pre>`;
            });
        }

        $('#exampleResponseBody').html(html);
        $('#btnExampleResponse').show();
    } else {
        $('#btnExampleResponse').hide();
        $('#exampleResponsePanel').hide();
    }
}

// ──────────────────────────────────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────────────────────────────────
$(document).on('click', '.tab-btn', function() {
    const tab = $(this).data('tab');
    $('.tab-btn').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    $(`#tab-${tab}`).addClass('active');
});

// ──────────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────────
$(document).ready(function() {
    buildSidebar();
    updateBaseUrlBadge();

    // Auth panel toggle
    $('#authPanelToggle').on('click', function() {
        $('#authPanelBody').toggleClass('open');
        const isOpen = $('#authPanelBody').hasClass('open');
        $('#authChevron').css('transform', isOpen ? 'rotate(180deg)' : '');
    });

    // Auth method tabs
    $('.auth-method-tab').on('click', function() {
        state.authMethod = $(this).data('method');
        $('.auth-method-tab').removeClass('active');
        $(this).addClass('active');
        if (state.authMethod === 'signature') {
            $('#secretKeyLabel').text('비밀 키 (Secret Key, Hex)');
            $('#secretKey').attr('placeholder', '비밀 키 입력 (Hex 형식)');
        } else {
            $('#secretKeyLabel').text('Bearer 토큰');
            $('#secretKey').attr('placeholder', 'Bearer 토큰 값 입력');
        }
    });

    // Get token button
    $('#btnGetToken').on('click', getAccessToken);

    // Clear token
    $('#btnClearToken').on('click', function() {
        state.accessToken = '';
        updateAuthUI();
        $('#headersBody tr').each(function() {
            if ($(this).find('.header-key').val() === 'Authorization') {
                $(this).find('.header-val').val('');
            }
        });
        showToast('토큰이 초기화되었습니다');
    });

    // Copy token
    $('#tokenDisplay').on('click', function() {
        if (!state.accessToken) return;
        navigator.clipboard.writeText(state.accessToken).then(() => showToast('토큰이 복사되었습니다'));
    });

    // Env change
    $('#envSelect').on('change', function() {
        const v = $(this).val();
        $('#customDomainWrap').toggle(v === 'custom');
        updateBaseUrlBadge();
        updateUrlPreview();
    });
    $('#customDomainInput').on('input', function() {
        updateBaseUrlBadge();
        updateUrlPreview();
    });

    // Sidebar search
    $('#sidebarSearch').on('input', function() {
        buildSidebar($(this).val());
    });

    // Send 드롭다운 토글
    $('#btnSendArrow').on('click', function(e) {
        e.stopPropagation();
        $('#sendDropdownMenu').toggleClass('open');
    });
    $(document).on('click', function() {
        $('#sendDropdownMenu').removeClass('open');
    });
});

// ──────────────────────────────────────────────────────────────────────────
// HORIZONTAL RESIZER (Request ↕ Response)
// ──────────────────────────────────────────────────────────────────────────
(function() {
    const hResizer = document.getElementById('hResizer');
    const tabsContainer = document.getElementById('tabsContainer');

    hResizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        const startY = e.clientY;
        const startH = tabsContainer.offsetHeight;
        hResizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(e) {
            const newH = Math.max(80, Math.min(600, startH + e.clientY - startY));
            tabsContainer.style.height = newH + 'px';
        }

        function onMouseUp() {
            hResizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

// ──────────────────────────────────────────────────────────────────────────
// SIDEBAR RESIZE
// ──────────────────────────────────────────────────────────────────────────
(function() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('sidebar');
    let startX, startW;

    resizer.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startW = sidebar.offsetWidth;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(e) {
            const delta = e.clientX - startX;
            const newW = Math.min(520, Math.max(160, startW + delta));
            sidebar.style.width = newW + 'px';
        }

        function onMouseUp() {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

function updateBaseUrlBadge() {
    const url = getBaseUrl();
    $('#baseUrlBadge').text(url || '(도메인 미지정)');
}

// ──────────────────────────────────────────────────────────────────────────
// CODE SNIPPET
// ──────────────────────────────────────────────────────────────────────────
let currentLang = 'curl';

function showCodeModal() {
    if (!state.currentEndpoint) { showToast('API를 먼저 선택해주세요'); return; }
    currentLang = 'curl';
    $('#langTabs .lang-tab').removeClass('active');
    $('#langTabs .lang-tab[data-lang="curl"]').addClass('active');
    renderSnippet();
    $('#codeModal').addClass('open');
}

function closeCodeModal() {
    $('#codeModal').removeClass('open');
}

// ──────────────────────────────────────────────────────────────────────────
// GUIDE MODAL
// ──────────────────────────────────────────────────────────────────────────
function openGuide() {
    $('#guideModal').addClass('open');
}

function closeGuide() {
    $('#guideModal').removeClass('open');
}

function closeGuideOutside(e) {
    if ($(e.target).is('#guideModal')) closeGuide();
}

function copyCodeSnippet() {
    const text = $('#codeSnippetPre').text();
    navigator.clipboard.writeText(text).then(() => showToast('코드가 복사되었습니다'));
}

function renderSnippet() {
    const url    = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();

    // 활성화된 헤더 수집
    const headers = {};
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked')) {
            const k = $(this).find('.header-key').val().trim();
            const v = $(this).find('.header-val').val().trim();
            if (k) headers[k] = v;
        }
    });

    // Body (POST/PUT/PATCH)
    const bodyRaw = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        ? $('#bodyEditor').val().trim() : '';

    let snippet = '';
    switch (currentLang) {
        case 'curl':    snippet = snippetCurl(url, method, headers, bodyRaw);    break;
        case 'fetch':   snippet = snippetFetch(url, method, headers, bodyRaw);   break;
        case 'jquery':  snippet = snippetJQuery(url, method, headers, bodyRaw);  break;
        case 'python':  snippet = snippetPython(url, method, headers, bodyRaw);  break;
        case 'java':    snippet = snippetJava(url, method, headers, bodyRaw);    break;
    }
    $('#codeSnippetPre').text(snippet);
}

function snippetCurl(url, method, headers, body) {
    const lines = [`curl --location --request ${method} '${url}'`];
    Object.entries(headers).forEach(([k, v]) => {
        lines.push(`  --header '${k}: ${v}'`);
    });
    if (body) {
        lines.push(`  --data-raw '${body}'`);
    }
    return lines.join(' \\\n');
}

function snippetFetch(url, method, headers, body) {
    const headersJson = JSON.stringify(headers, null, 2).replace(/^/gm, '  ');
    let code = `const response = await fetch('${url}', {\n`;
    code += `  method: '${method}',\n`;
    code += `  headers: ${headersJson}`;
    if (body) {
        code += `,\n  body: \`${body}\``;
    }
    code += `\n});\n\n`;
    code += `const data = await response.json();\nconsole.log(data);`;
    return code;
}

function snippetJQuery(url, method, headers, body) {
    // Content-Type은 jQuery contentType 옵션으로 분리
    const ct = headers['Content-Type'] || 'application/json';
    const otherHeaders = Object.fromEntries(
        Object.entries(headers).filter(([k]) => k !== 'Content-Type')
    );
    const headersJson = JSON.stringify(otherHeaders, null, 4).replace(/^/gm, '    ');

    let code = `$.ajax({\n`;
    code += `    url: '${url}',\n`;
    code += `    method: '${method}',\n`;
    code += `    contentType: '${ct}',\n`;
    if (Object.keys(otherHeaders).length) {
        code += `    headers: ${headersJson},\n`;
    }
    if (body) {
        code += `    data: JSON.stringify(${body}),\n`;
    }
    code += `    success: function(data) {\n        console.log(data);\n    },\n`;
    code += `    error: function(err) {\n        console.error(err);\n    }\n`;
    code += `});`;
    return code;
}

function snippetPython(url, method, headers, body) {
    const headersRepr = JSON.stringify(headers, null, 4).replace(/^/gm, '    ').trimStart();
    let code = `import requests\n\n`;
    code += `url = "${url}"\n\n`;
    code += `headers = ${headersRepr}\n\n`;
    if (body) {
        code += `payload = ${body}\n\n`;
        code += `response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)\n`;
    } else {
        code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }
    code += `print(response.json())`;
    return code;
}

function snippetJava(url, method, headers, body) {
    let code = `import java.net.URI;\n`;
    code += `import java.net.http.HttpClient;\n`;
    code += `import java.net.http.HttpRequest;\n`;
    code += `import java.net.http.HttpResponse;\n\n`;
    code += `HttpClient client = HttpClient.newHttpClient();\n\n`;

    // 헤더 빌더 체인
    const headerLines = Object.entries(headers)
        .map(([k, v]) => `        .header("${k}", "${v}")`).join('\n');

    code += `HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `        .uri(URI.create("${url}"))\n`;
    if (headerLines) code += `${headerLines}\n`;

    if (body) {
        code += `        .method("${method}", HttpRequest.BodyPublishers.ofString("""\n`;
        code += `                ${body.replace(/\n/g, '\n                ')}\n`;
        code += `                """))\n`;
    } else {
        code += `        .method("${method}", HttpRequest.BodyPublishers.noBody())\n`;
    }
    code += `        .build();\n\n`;
    code += `HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n`;
    code += `System.out.println(response.body());`;
    return code;
}

// 언어탭 클릭
$(document).on('click', '.lang-tab', function() {
    currentLang = $(this).data('lang');
    $('.lang-tab').removeClass('active');
    $(this).addClass('active');
    renderSnippet();
});

// 모달 바깥 클릭 시 닫기
$(document).on('click', '#codeModal', function(e) {
    if ($(e.target).is('#codeModal')) closeCodeModal();
});

// ──────────────────────────────────────────────────────────────────────────
// API 명세 데이터
// ──────────────────────────────────────────────────────────────────────────
const API_SPECS = {
    'OPA2_001': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'eformsign_signature', required: true, description: 'execution_time 값의 ECDSA 서명값', example: '304502206b59b0af...' },
            { key: 'Authorization', required: true, description: 'API Key 값을 Base64 인코딩하여 Bearer 토큰으로 사용', example: 'Bearer MDBhMWFk...' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'execution_time', type: 'number', required: true, description: 'API 호출 시간 (현재 시간, Unix timestamp ms)' },
            { key: 'member_id', type: 'string', required: true, description: '회사 멤버의 ID (이메일)' },
        ],
        responseFields: [
            { key: 'api_key', type: 'object', description: 'API Key 정보' },
            { key: 'api_key.name', type: 'string', description: 'API Key 이름' },
            { key: 'api_key.alias', type: 'string', description: 'API Key 별칭' },
            { key: 'api_key.company.id', type: 'string', description: '회사 ID' },
            { key: 'api_key.company.name', type: 'string', description: '회사명' },
            { key: 'api_key.company.api_url', type: 'string', description: '해당 회사 서비스 API URL' },
            { key: 'oauth_token', type: 'object', description: '토큰 정보' },
            { key: 'oauth_token.token_type', type: 'string', description: '토큰 타입 (JWT)' },
            { key: 'oauth_token.access_token', type: 'string', description: 'Access Token' },
            { key: 'oauth_token.refresh_token', type: 'string', description: 'Refresh Token' },
            { key: 'oauth_token.expires_in', type: 'number', description: 'Access Token 유효시간 (초)' },
        ],
        errorCodes: [
            { code: '4000002', message: 'The validation time has expired.', description: '검증 시간 만료 (30초 초과)' },
            { code: '4030004', message: 'The signature is invalid.', description: '서명값이 유효하지 않음' },
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
        ],
    },
    'OPA2_002': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'refresh_token', type: 'string', required: true, description: '갱신에 사용할 Refresh Token' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'oauth_token', type: 'object', description: '토큰 정보' },
            { key: 'oauth_token.token_type', type: 'string', description: '토큰 타입' },
            { key: 'oauth_token.access_token', type: 'string', description: '새로 발급된 Access Token' },
            { key: 'oauth_token.refresh_token', type: 'string', description: '새로 발급된 Refresh Token' },
            { key: 'oauth_token.expires_in', type: 'number', description: 'Access Token 유효시간 (초)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '토큰이 유효하지 않거나 만료됨' },
            { code: '4010002', message: 'The refresh_token is invalid.', description: 'Refresh Token이 유효하지 않음' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000002', message: 'The validation time has expired.', description: '검증 시간 만료' },
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
        ],
    },
    'OPA2_003': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'include_fields', type: 'boolean', required: false, description: '응답에 필드(컴포넌트) 데이터 포함 여부' },
            { key: 'include_histories', type: 'boolean', required: false, description: '응답에 문서 이력 포함 여부' },
            { key: 'include_previous_status', type: 'boolean', required: false, description: '응답에 이전 단계 정보 포함 여부' },
            { key: 'include_next_status', type: 'boolean', required: false, description: '응답에 다음 단계 정보 포함 여부' },
            { key: 'include_external_token', type: 'boolean', required: false, description: '응답에 참여자 Token 정보 포함 여부' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'id', type: 'string', description: '문서 ID' },
            { key: 'document_number', type: 'string', description: '문서 번호' },
            { key: 'template', type: 'object', description: '템플릿 정보' },
            { key: 'template.id', type: 'string', description: '템플릿 ID' },
            { key: 'template.name', type: 'string', description: '템플릿명' },
            { key: 'document_name', type: 'string', description: '문서 제목' },
            { key: 'creator', type: 'object', description: '문서 생성자 정보' },
            { key: 'created_date', type: 'number', description: '생성일 (Epoch Time ms)' },
            { key: 'current_status', type: 'object', description: '현재 상태 정보' },
            { key: 'current_status.status_type', type: 'string', description: '현재 상태 타입' },
            { key: 'fields', type: 'array', description: '필드(컴포넌트) 객체 목록 (include_fields=true 시)' },
            { key: 'recipients', type: 'array', description: '참여자 정보 목록' },
            { key: 'histories', type: 'array', description: '문서 이력 목록 (include_histories=true 시)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
        ],
    },
    'OPA2_004': {
        requestHeaders: [
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'file_type', type: 'string', required: true, description: '다운로드 파일 타입 — document: 문서 PDF, audit_trail: 감사추적증명 PDF' },
            { key: 'file_name', type: 'string', required: false, description: '다운로드 파일 이름 (확장자 제외)' },
        ],
        requestBody: [],
        responseFields: [
            { key: '(binary)', type: 'binary', description: 'PDF 파일 스트림 (Content-Type: application/pdf)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
        ],
    },
    'OPA2_005': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'template_id', type: 'string', required: true, description: '작성할 템플릿의 ID' },
        ],
        requestBody: [
            { key: 'document', type: 'object', required: true, description: '문서 정보' },
            { key: 'document.document_name', type: 'string', required: false, description: '문서 제목' },
            { key: 'document.comment', type: 'string', required: false, description: '문서 전송 시 메시지' },
            { key: 'document.select_group_name', type: 'string', required: false, description: '템플릿에 설정된 그룹 중 선택할 그룹명' },
            { key: 'document.fields', type: 'array', required: false, description: '문서 컴포넌트에 작성할 데이터 리스트' },
            { key: 'document.fields[].id', type: 'string', required: false, description: '컴포넌트 form ID' },
            { key: 'document.fields[].value', type: 'string', required: false, description: '컴포넌트에 입력할 값' },
            { key: 'document.recipients', type: 'array', required: false, description: '다음 단계 수신자 리스트' },
            { key: 'document.recipients[].step_type', type: 'string', required: false, description: '워크플로우 단계 타입 (05:참여자, 06:검토자, 07:열람자)' },
            { key: 'document.recipients[].use_mail', type: 'boolean', required: false, description: '이메일 발송 여부' },
            { key: 'document.recipients[].use_sms', type: 'boolean', required: false, description: 'SMS 발송 여부' },
            { key: 'document.recipients[].business_num', type: 'string', required: false, description: '수신자 사업자번호 (외부자 인증용)' },
            { key: 'document.recipients[].member', type: 'object', required: false, description: '수신자 멤버 정보' },
            { key: 'document.recipients[].member.name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'document.recipients[].member.id', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'document.recipients[].member.sms', type: 'object', required: false, description: '수신자 SMS 정보' },
            { key: 'document.recipients[].member.sms.country_code', type: 'string', required: false, description: '국가 코드 (예: +82)' },
            { key: 'document.recipients[].member.sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'document.recipients[].auth', type: 'object', required: false, description: '수신자 인증 정보' },
            { key: 'document.recipients[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'document.recipients[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'document.recipients[].auth.valid', type: 'object', required: false, description: '링크 유효기간' },
            { key: 'document.recipients[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'document.recipients[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'document.notification', type: 'array', required: false, description: '완료 후 문서 전송 대상 리스트 (이메일/SMS)' },
            { key: 'document.notification[].email', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'document.notification[].sms', type: 'object', required: false, description: '수신자 SMS 정보' },
            { key: 'document.notification[].sms.country_code', type: 'string', required: false, description: '국가 코드' },
            { key: 'document.notification[].sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'document.notification[].name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'document.notification[].auth', type: 'object', required: false, description: '인증 정보' },
            { key: 'document.notification[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'document.notification[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'document.notification[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'document.notification[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'document.notification[].auth.mobile_verification', type: 'boolean', required: false, description: '모바일 인증 여부' },
        ],
        responseFields: [
            { key: 'template_id', type: 'string', description: '템플릿 ID' },
            { key: 'document', type: 'object', description: '생성된 문서 정보' },
            { key: 'document.id', type: 'string', description: '문서 ID' },
            { key: 'document.document_name', type: 'string', description: '문서 제목' },
            { key: 'document.document_status', type: 'string', description: '문서 상태' },
            { key: 'recipients', type: 'array', description: '수신자 리스트' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000046', message: 'There is no template.', description: '템플릿이 존재하지 않음' },
            { code: '4000012', message: 'The next_steps set by the user is inconsistent with the template\'s workflow settings.', description: '워크플로우 설정 불일치' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
        ],
    },
    'OPA2_006': {
        requestHeaders: [
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'doc_without_attachments', type: 'boolean', required: false, description: '첨부 파일이 제외된 문서 PDF도 함께 포함할지 여부' },
        ],
        requestBody: [],
        responseFields: [
            { key: '(binary)', type: 'binary', description: 'ZIP 파일 스트림 (문서 PDF + 첨부 파일 포함)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
            { code: '4000058', message: 'No attachment file exists.', description: '첨부 파일 없음' },
        ],
    },
    'OPA2_007': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'API Key를 Base64 인코딩하여 Bearer 토큰으로 사용 (Access Token 아님)', example: 'Bearer <base64(api_key)>' },
        ],
        queryParams: [
            { key: 'company_id', type: 'string', required: true, description: '작성할 템플릿이 속한 회사 ID' },
            { key: 'template_id', type: 'string', required: true, description: '작성할 템플릿의 ID' },
        ],
        requestBody: [
            { key: 'document', type: 'object', required: true, description: '문서 정보' },
            { key: 'document.document_name', type: 'string', required: false, description: '문서 제목' },
            { key: 'document.comment', type: 'string', required: false, description: '문서 전송 시 메시지' },
            { key: 'document.select_group_name', type: 'string', required: false, description: '템플릿에 설정된 그룹 중 선택할 그룹명' },
            { key: 'document.fields', type: 'array', required: false, description: '컴포넌트에 작성할 데이터 리스트' },
            { key: 'document.fields[].id', type: 'string', required: false, description: '컴포넌트 form ID' },
            { key: 'document.fields[].value', type: 'string', required: false, description: '컴포넌트에 입력할 값' },
            { key: 'document.recipients', type: 'array', required: false, description: '다음 단계 수신자 리스트' },
            { key: 'document.recipients[].step_type', type: 'string', required: false, description: '워크플로우 단계 타입 (05:참여자, 06:검토자, 07:열람자)' },
            { key: 'document.recipients[].use_mail', type: 'boolean', required: false, description: '이메일 발송 여부' },
            { key: 'document.recipients[].use_sms', type: 'boolean', required: false, description: 'SMS 발송 여부' },
            { key: 'document.recipients[].business_num', type: 'string', required: false, description: '수신자 사업자번호 (외부자 인증용)' },
            { key: 'document.recipients[].member', type: 'object', required: false, description: '수신자 멤버 정보' },
            { key: 'document.recipients[].member.name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'document.recipients[].member.id', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'document.recipients[].member.sms', type: 'object', required: false, description: '수신자 SMS 정보' },
            { key: 'document.recipients[].member.sms.country_code', type: 'string', required: false, description: '국가 코드 (예: +82)' },
            { key: 'document.recipients[].member.sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'document.recipients[].auth', type: 'object', required: false, description: '수신자 인증 정보' },
            { key: 'document.recipients[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'document.recipients[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'document.recipients[].auth.valid', type: 'object', required: false, description: '링크 유효기간' },
            { key: 'document.recipients[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'document.recipients[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'document.notification', type: 'array', required: false, description: '완료 후 문서 전송 대상 리스트 (이메일/SMS)' },
            { key: 'document.notification[].email', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'document.notification[].sms', type: 'object', required: false, description: '수신자 SMS 정보' },
            { key: 'document.notification[].sms.country_code', type: 'string', required: false, description: '국가 코드' },
            { key: 'document.notification[].sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'document.notification[].name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'document.notification[].auth', type: 'object', required: false, description: '인증 정보' },
            { key: 'document.notification[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'document.notification[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'document.notification[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'document.notification[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'document.notification[].auth.mobile_verification', type: 'boolean', required: false, description: '모바일 인증 여부' },
            { key: 'document.send_external_pdf', type: 'object', required: false, description: '외부 작성자 완료 문서 전송 정보 (OPA2_007 전용)' },
        ],
        responseFields: [
            { key: 'template_id', type: 'string', description: '템플릿 ID' },
            { key: 'document', type: 'object', description: '생성된 문서 정보' },
            { key: 'document.id', type: 'string', description: '문서 ID' },
            { key: 'document.document_name', type: 'string', description: '문서 제목' },
            { key: 'document.document_status', type: 'string', description: '문서 상태' },
            { key: 'recipients', type: 'array', description: '수신자 리스트' },
        ],
        errorCodes: [
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
            { code: '4000046', message: 'There is no template.', description: '템플릿이 존재하지 않음' },
            { code: '4000012', message: 'The next_steps set by the user is inconsistent with the template\'s workflow settings.', description: '워크플로우 설정 불일치' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
        ],
    },
    'OPA2_008': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'include_fields', type: 'boolean', required: false, description: '응답에 필드 데이터 포함 여부' },
            { key: 'include_histories', type: 'boolean', required: false, description: '응답에 문서 이력 포함 여부' },
        ],
        requestBody: [
            { key: 'type', type: 'string', required: true, description: '문서함 타입 — 01: 진행 중, 02: 처리할, 03: 완료, 04: 문서 목록 (전체)' },
            { key: 'limit', type: 'string', required: true, description: '한 번에 표시할 문서 수' },
            { key: 'skip', type: 'string', required: true, description: '건너뛸 문서 수 (페이징)' },
            { key: 'title_and_content', type: 'string', required: false, description: '문서 제목 및 내용 검색 쿼리' },
            { key: 'title', type: 'string', required: false, description: '문서 제목 검색 쿼리' },
            { key: 'content', type: 'string', required: false, description: '문서 내용 검색 쿼리' },
            { key: 'start_create_date', type: 'number', required: false, description: '문서 작성일 시작 범위 (Epoch Time ms)' },
            { key: 'end_create_date', type: 'number', required: false, description: '문서 작성일 종료 범위 (Epoch Time ms)' },
        ],
        responseFields: [
            { key: 'documents', type: 'array', description: '문서 객체 목록' },
            { key: 'documents[].id', type: 'string', description: '문서 ID' },
            { key: 'documents[].template.id', type: 'string', description: '템플릿 ID' },
            { key: 'documents[].template.name', type: 'string', description: '템플릿명' },
            { key: 'documents[].document_name', type: 'string', description: '문서 제목' },
            { key: 'documents[].created_date', type: 'number', description: '생성일 (Epoch Time ms)' },
            { key: 'documents[].current_status', type: 'object', description: '현재 상태 정보' },
            { key: 'total_rows', type: 'number', description: '전체 문서 수' },
            { key: 'limit', type: 'number', description: '한 번에 표시되는 문서 수' },
            { key: 'skip', type: 'number', description: '건너뛴 문서 수' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4030001', message: 'invalid api key', description: 'API Key가 유효하지 않음' },
        ],
    },
    'OPA2_009': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'is_permanent', type: 'boolean', required: false, description: '즉시 완전 삭제 여부 (true: 복구 불가 영구 삭제)' },
        ],
        requestBody: [
            { key: 'document_ids', type: 'array', required: true, description: '삭제할 문서 ID 배열 (string 형태)' },
        ],
        responseFields: [
            { key: 'result.success_result', type: 'array', description: '삭제 성공한 결과 목록' },
            { key: 'result.fail_result', type: 'array', description: '삭제 실패한 결과 목록' },
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드 (200: 정상)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000004', message: 'No document selected.', description: '선택된 문서 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
        ],
    },
    'OPA2_010': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'limit', type: 'string', required: true, description: '한 번에 표시할 멤버 수' },
            { key: 'skip', type: 'string', required: true, description: '건너뛸 멤버 수 (페이징)' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'members', type: 'array', description: '멤버 정보 목록' },
            { key: 'members[].member_id', type: 'string', description: '멤버 ID' },
            { key: 'members[].name', type: 'string', description: '멤버 이름' },
            { key: 'members[].email', type: 'string', description: '멤버 이메일' },
            { key: 'members[].status', type: 'string', description: '멤버 상태' },
            { key: 'total_rows', type: 'number', description: '전체 멤버 수' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_011': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'member', type: 'object', required: true, description: '추가할 멤버 정보' },
            { key: 'member.name', type: 'string', required: true, description: '멤버 이름' },
            { key: 'member.email', type: 'string', required: true, description: '멤버 이메일 (로그인 ID)' },
            { key: 'member.phone_number', type: 'string', required: false, description: '멤버 휴대폰 번호' },
            { key: 'member.department', type: 'string', required: false, description: '부서' },
            { key: 'member.position', type: 'string', required: false, description: '직급' },
        ],
        responseFields: [
            { key: 'member_id', type: 'string', description: '생성된 멤버 ID' },
            { key: 'name', type: 'string', description: '멤버 이름' },
            { key: 'email', type: 'string', description: '멤버 이메일' },
            { key: 'status', type: 'string', description: '멤버 상태' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000100', message: 'The user already exists.', description: '이미 존재하는 사용자' },
            { code: '4000004', message: 'Invalid input.', description: '입력값이 유효하지 않음' },
        ],
    },
    'OPA2_012': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'member', type: 'object', required: true, description: '수정할 멤버 정보' },
            { key: 'member.name', type: 'string', required: false, description: '멤버 이름' },
            { key: 'member.phone_number', type: 'string', required: false, description: '멤버 휴대폰 번호' },
            { key: 'member.department', type: 'string', required: false, description: '부서' },
            { key: 'member.position', type: 'string', required: false, description: '직급' },
        ],
        responseFields: [
            { key: 'member_id', type: 'string', description: '멤버 ID' },
            { key: 'name', type: 'string', description: '수정된 멤버 이름' },
            { key: 'email', type: 'string', description: '멤버 이메일' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_013': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'account_id', type: 'string', required: true, description: '탈퇴시킬 멤버의 account_id' },
        ],
        responseFields: [
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000004', message: 'No member found.', description: '멤버를 찾을 수 없음' },
        ],
    },
    'OPA2_014': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'input', type: 'object', required: true, description: '재요청 정보' },
            { key: 'input.next_steps', type: 'array', required: true, description: '다음 단계 정보 목록' },
            { key: 'input.next_steps[].step_type', type: 'string', required: true, description: '단계 종류 (05: 참여자, 06: 검토자, 07: 열람자)' },
            { key: 'input.next_steps[].step_seq', type: 'number', required: false, description: '단계 순번' },
            { key: 'input.next_steps[].comment', type: 'string', required: false, description: '재요청 메시지' },
            { key: 'input.next_steps[].recipients', type: 'array', required: false, description: '수신자 정보' },
            { key: 'input.next_steps[].recipients[].member', type: 'object', required: false, description: '수신자 멤버 정보' },
            { key: 'input.next_steps[].recipients[].member.name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'input.next_steps[].recipients[].member.id', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'input.next_steps[].recipients[].member.sms', type: 'object', required: false, description: '수신자 SMS 정보' },
            { key: 'input.next_steps[].recipients[].member.sms.country_code', type: 'string', required: false, description: '국가 코드 (예: +82)' },
            { key: 'input.next_steps[].recipients[].member.sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'input.next_steps[].recipients[].use_mail', type: 'boolean', required: false, description: '이메일 발송 여부' },
            { key: 'input.next_steps[].recipients[].use_sms', type: 'boolean', required: false, description: 'SMS 발송 여부' },
            { key: 'input.next_steps[].recipients[].auth', type: 'object', required: false, description: '수신자 인증 정보' },
            { key: 'input.next_steps[].recipients[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'input.next_steps[].recipients[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'input.next_steps[].recipients[].auth.valid', type: 'object', required: false, description: '링크 유효기간' },
            { key: 'input.next_steps[].recipients[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'input.next_steps[].recipients[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
        ],
        responseFields: [
            { key: 'status', type: 'string', description: 'HTTP 응답 코드' },
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'recipients', type: 'array', description: '수신자 정보 목록' },
            { key: 'recipients[].name', type: 'string', description: '수신자 이름' },
            { key: 'recipients[].id', type: 'string', description: '수신자 이메일' },
            { key: 'recipients[].token_id', type: 'string', description: '수신자 토큰 ID' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
            { code: '4000012', message: 'The next_steps set by the user is inconsistent with the template\'s workflow settings.', description: '워크플로우 설정 불일치' },
        ],
    },
    'OPA2_015': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'limit', type: 'string', required: true, description: '한 번에 표시할 템플릿 수' },
            { key: 'skip', type: 'string', required: true, description: '건너뛸 템플릿 수 (페이징)' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'forms', type: 'array', description: '템플릿 정보 목록' },
            { key: 'forms[].id', type: 'string', description: '템플릿 ID' },
            { key: 'forms[].name', type: 'string', description: '템플릿 이름' },
            { key: 'forms[].description', type: 'string', description: '템플릿 설명' },
            { key: 'total_rows', type: 'number', description: '전체 템플릿 수' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_016': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'template_id', type: 'string', required: true, description: '일괄 작성할 템플릿의 ID' },
        ],
        requestBody: [
            { key: 'documents', type: 'array', required: true, description: '작성할 문서 목록' },
            { key: 'documents[].document_name', type: 'string', required: false, description: '문서 제목' },
            { key: 'documents[].select_group_name', type: 'string', required: false, description: '템플릿에 설정된 그룹 중 선택할 그룹명' },
            { key: 'documents[].fields', type: 'array', required: false, description: '컴포넌트에 작성할 데이터 리스트' },
            { key: 'documents[].fields[].id', type: 'string', required: false, description: '컴포넌트 form ID' },
            { key: 'documents[].fields[].value', type: 'string', required: false, description: '컴포넌트에 입력할 값' },
            { key: 'documents[].parameters', type: 'array', required: false, description: '추가 파라미터 리스트' },
            { key: 'documents[].parameters[].id', type: 'string', required: false, description: '파라미터 ID' },
            { key: 'documents[].parameters[].value', type: 'string', required: false, description: '파라미터 값' },
            { key: 'documents[].recipients', type: 'array', required: false, description: '다음 단계 수신자 리스트' },
            { key: 'documents[].recipients[].step_type', type: 'string', required: false, description: '워크플로우 단계 타입 (05:참여자, 06:검토자, 07:열람자)' },
            { key: 'documents[].recipients[].use_mail', type: 'boolean', required: false, description: '이메일 발송 여부' },
            { key: 'documents[].recipients[].use_sms', type: 'boolean', required: false, description: 'SMS 발송 여부' },
            { key: 'documents[].recipients[].member', type: 'object', required: false, description: '수신자 멤버 정보' },
            { key: 'documents[].recipients[].member.name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'documents[].recipients[].member.id', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'documents[].recipients[].member.sms.country_code', type: 'string', required: false, description: '국가 코드' },
            { key: 'documents[].recipients[].member.sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'documents[].recipients[].group', type: 'object', required: false, description: '수신자 그룹 정보' },
            { key: 'documents[].recipients[].group.id', type: 'string', required: false, description: '그룹 ID' },
            { key: 'documents[].recipients[].auth', type: 'object', required: false, description: '수신자 인증 정보' },
            { key: 'documents[].recipients[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'documents[].recipients[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'documents[].recipients[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'documents[].recipients[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'comment', type: 'string', required: false, description: '코멘트' },
        ],
        responseFields: [
            { key: 'result.success_result', type: 'array', description: '요청 성공 문서 번호 목록' },
            { key: 'result.request_id', type: 'string', description: '일괄 작성 요청 ID' },
            { key: 'result.fail_result', type: 'array', description: '요청 실패 문서 번호 목록' },
            { key: 'code', type: 'string', description: '결과 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드 (200: 정상)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000046', message: 'There is no template.', description: '템플릿이 존재하지 않음' },
            { code: '4000012', message: 'The next_steps set by the user is inconsistent with the template\'s workflow settings.', description: '워크플로우 설정 불일치' },
        ],
    },
    'OPA2_017': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'limit', type: 'string', required: true, description: '한 번에 표시할 그룹 수' },
            { key: 'skip', type: 'string', required: true, description: '건너뛸 그룹 수 (페이징)' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'groups', type: 'array', description: '그룹 정보 목록' },
            { key: 'groups[].group_id', type: 'string', description: '그룹 ID' },
            { key: 'groups[].name', type: 'string', description: '그룹 이름' },
            { key: 'groups[].description', type: 'string', description: '그룹 설명' },
            { key: 'groups[].members', type: 'array', description: '그룹 멤버 목록' },
            { key: 'total_rows', type: 'number', description: '전체 그룹 수' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_018': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'group', type: 'object', required: true, description: '추가할 그룹 정보' },
            { key: 'group.name', type: 'string', required: true, description: '그룹 이름' },
            { key: 'group.description', type: 'string', required: false, description: '그룹 설명' },
            { key: 'group.members', type: 'array', required: false, description: '그룹에 추가할 멤버 ID 목록' },
        ],
        responseFields: [
            { key: 'group_id', type: 'string', description: '생성된 그룹 ID' },
            { key: 'name', type: 'string', description: '그룹 이름' },
            { key: 'description', type: 'string', description: '그룹 설명' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_019': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'group', type: 'object', required: true, description: '수정할 그룹 정보' },
            { key: 'group.name', type: 'string', required: false, description: '그룹 이름' },
            { key: 'group.description', type: 'string', required: false, description: '그룹 설명' },
            { key: 'group.members', type: 'array', required: false, description: '그룹 멤버 ID 목록 (전체 대체)' },
        ],
        responseFields: [
            { key: 'group_id', type: 'string', description: '그룹 ID' },
            { key: 'name', type: 'string', description: '수정된 그룹 이름' },
            { key: 'description', type: 'string', description: '수정된 그룹 설명' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000004', message: 'No group found.', description: '그룹을 찾을 수 없음' },
        ],
    },
    'OPA2_020': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'group_ids', type: 'array', required: true, description: '삭제할 그룹 ID 배열' },
        ],
        responseFields: [
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000004', message: 'No group found.', description: '그룹을 찾을 수 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
        ],
    },
    'OPA2_021': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'documents', type: 'array', required: true, description: '작성할 문서 목록 (각각 다른 템플릿 가능)' },
            { key: 'documents[].template_id', type: 'string', required: true, description: '해당 문서의 템플릿 ID' },
            { key: 'documents[].document_name', type: 'string', required: false, description: '문서 제목' },
            { key: 'documents[].select_group_name', type: 'string', required: false, description: '템플릿에 설정된 그룹 중 선택할 그룹명' },
            { key: 'documents[].fields', type: 'array', required: false, description: '컴포넌트에 작성할 데이터 리스트' },
            { key: 'documents[].fields[].id', type: 'string', required: false, description: '컴포넌트 form ID' },
            { key: 'documents[].fields[].value', type: 'string', required: false, description: '컴포넌트에 입력할 값' },
            { key: 'documents[].parameters', type: 'array', required: false, description: '추가 파라미터 리스트' },
            { key: 'documents[].parameters[].id', type: 'string', required: false, description: '파라미터 ID' },
            { key: 'documents[].parameters[].value', type: 'string', required: false, description: '파라미터 값' },
            { key: 'documents[].recipients', type: 'array', required: false, description: '다음 단계 수신자 리스트' },
            { key: 'documents[].recipients[].step_type', type: 'string', required: false, description: '워크플로우 단계 타입 (05:참여자, 06:검토자, 07:열람자)' },
            { key: 'documents[].recipients[].use_mail', type: 'boolean', required: false, description: '이메일 발송 여부' },
            { key: 'documents[].recipients[].use_sms', type: 'boolean', required: false, description: 'SMS 발송 여부' },
            { key: 'documents[].recipients[].member', type: 'object', required: false, description: '수신자 멤버 정보' },
            { key: 'documents[].recipients[].member.name', type: 'string', required: false, description: '수신자 이름' },
            { key: 'documents[].recipients[].member.id', type: 'string', required: false, description: '수신자 이메일' },
            { key: 'documents[].recipients[].member.sms.country_code', type: 'string', required: false, description: '국가 코드' },
            { key: 'documents[].recipients[].member.sms.phone_number', type: 'string', required: false, description: '휴대폰 번호' },
            { key: 'documents[].recipients[].auth', type: 'object', required: false, description: '수신자 인증 정보' },
            { key: 'documents[].recipients[].auth.password', type: 'string', required: false, description: '열람 비밀번호' },
            { key: 'documents[].recipients[].auth.password_hint', type: 'string', required: false, description: '비밀번호 힌트' },
            { key: 'documents[].recipients[].auth.valid.day', type: 'number', required: false, description: '유효기간 (일)' },
            { key: 'documents[].recipients[].auth.valid.hour', type: 'number', required: false, description: '유효기간 (시간)' },
            { key: 'comment', type: 'string', required: false, description: '코멘트' },
        ],
        responseFields: [
            { key: 'result.success_result', type: 'array', description: '요청 성공 문서 목록' },
            { key: 'result.request_id', type: 'string', description: '일괄 작성 요청 ID' },
            { key: 'result.fail_result', type: 'array', description: '요청 실패 문서 목록' },
            { key: 'code', type: 'string', description: '결과 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드 (200: 정상)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000046', message: 'There is no template.', description: '템플릿이 존재하지 않음' },
            { code: '4000012', message: 'The next_steps set by the user is inconsistent with the template\'s workflow settings.', description: '워크플로우 설정 불일치' },
        ],
    },
    'OPA2_024': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'form_ids', type: 'array', required: true, description: '삭제할 템플릿 ID 배열' },
        ],
        responseFields: [
            { key: 'result.success_result', type: 'array', description: '삭제 성공한 템플릿 ID 목록' },
            { key: 'result.fail_result', type: 'array', description: '삭제 실패한 템플릿 정보' },
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000046', message: 'There is no template.', description: '템플릿이 존재하지 않음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
        ],
    },
    'OPA2_025': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [],
        responseFields: [
            { key: 'company_stamp.id', type: 'string', description: '도장 ID' },
            { key: 'company_stamp.name', type: 'string', description: '도장 이름' },
            { key: 'company_stamp.description', type: 'string', description: '도장 설명' },
            { key: 'company_stamp.stamp.path', type: 'string', description: '도장 이미지 경로' },
            { key: 'company_stamp.auth.groups', type: 'array', description: '사용 가능한 그룹 ID 목록' },
            { key: 'company_stamp.auth.members', type: 'array', description: '사용 가능한 멤버 ID 목록' },
            { key: 'company_stamp.auth.allow_all_members', type: 'boolean', description: '전체 멤버 사용 허용 여부' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000175', message: 'No stamp found.', description: '도장을 찾을 수 없음' },
        ],
    },
    'OPA2_026': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'company_stamp', type: 'object', required: true, description: '추가할 도장 정보' },
            { key: 'company_stamp.name', type: 'string', required: true, description: '도장 이름' },
            { key: 'company_stamp.description', type: 'string', required: false, description: '도장 설명' },
            { key: 'company_stamp.stamp.path', type: 'string', required: true, description: '도장 이미지 경로 (Base64 또는 URL)' },
            { key: 'company_stamp.auth.groups', type: 'array', required: false, description: '사용 가능한 그룹 ID 목록' },
            { key: 'company_stamp.auth.members', type: 'array', required: false, description: '사용 가능한 멤버 ID 목록' },
            { key: 'company_stamp.auth.allow_all_members', type: 'boolean', required: false, description: '전체 멤버 사용 허용 여부' },
        ],
        responseFields: [
            { key: 'company_stamp.id', type: 'string', description: '생성된 도장 ID' },
            { key: 'company_stamp.name', type: 'string', description: '도장 이름' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000174', message: 'This name has already been used for another stamp.', description: '중복된 도장 이름' },
            { code: '4030009', message: 'You do not have access.', description: '접근 권한 없음' },
        ],
    },
    'OPA2_027': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'company_stamp', type: 'object', required: true, description: '수정할 도장 정보' },
            { key: 'company_stamp.name', type: 'string', required: false, description: '도장 이름' },
            { key: 'company_stamp.description', type: 'string', required: false, description: '도장 설명' },
            { key: 'company_stamp.stamp.path', type: 'string', required: false, description: '도장 이미지 경로' },
            { key: 'company_stamp.auth.groups', type: 'array', required: false, description: '사용 가능한 그룹 ID 목록' },
            { key: 'company_stamp.auth.members', type: 'array', required: false, description: '사용 가능한 멤버 ID 목록' },
            { key: 'company_stamp.auth.allow_all_members', type: 'boolean', required: false, description: '전체 멤버 사용 허용 여부' },
        ],
        responseFields: [
            { key: 'company_stamp.id', type: 'string', description: '도장 ID' },
            { key: 'company_stamp.name', type: 'string', description: '수정된 도장 이름' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4030009', message: 'You do not have access.', description: '접근 권한 없음' },
            { code: '4000175', message: 'No stamp found.', description: '도장을 찾을 수 없음' },
            { code: '400', message: 'Required request body is missing', description: '요청 Body 없음' },
        ],
    },
    'OPA2_028': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [],
        responseFields: [
            { key: 'code', type: 'string', description: '응답 코드 (-1: 정상)' },
            { key: 'message', type: 'string', description: '응답 메시지' },
            { key: 'status', type: 'string', description: 'HTTP 응답 코드 (200: 정상)' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000175', message: 'No stamp found.', description: '도장을 찾을 수 없음' },
            { code: '4030009', message: 'You do not have access.', description: '접근 권한 없음' },
        ],
    },
    'OPA2_029': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [
            { key: 'limit', type: 'string', required: true, description: '한 번에 표시할 도장 수' },
            { key: 'skip', type: 'string', required: true, description: '건너뛸 도장 수 (페이징)' },
        ],
        requestBody: [],
        responseFields: [
            { key: 'company_stamps', type: 'array', description: '도장 정보 목록' },
            { key: 'company_stamps[].id', type: 'string', description: '도장 ID' },
            { key: 'company_stamps[].name', type: 'string', description: '도장 이름' },
            { key: 'company_stamps[].description', type: 'string', description: '도장 설명' },
            { key: 'total_rows', type: 'number', description: '전체 도장 수' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
        ],
    },
    'OPA2_030': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'members', type: 'array', required: true, description: '추가할 멤버 정보 목록' },
            { key: 'members[].name', type: 'string', required: true, description: '멤버 이름' },
            { key: 'members[].email', type: 'string', required: true, description: '멤버 이메일' },
            { key: 'members[].phone_number', type: 'string', required: false, description: '멤버 휴대폰 번호' },
            { key: 'members[].department', type: 'string', required: false, description: '부서' },
            { key: 'members[].position', type: 'string', required: false, description: '직급' },
        ],
        responseFields: [
            { key: 'result.success_result', type: 'array', description: '추가 성공한 멤버 목록' },
            { key: 'result.fail_result', type: 'array', description: '추가 실패한 멤버 정보' },
            { key: 'code', type: 'string', description: '응답 코드' },
            { key: 'message', type: 'string', description: '응답 메시지' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000004', message: 'Invalid input.', description: '입력값이 유효하지 않음' },
        ],
    },
    'OPA2_031': {
        requestHeaders: [
            { key: 'Content-Type', required: true, description: 'Content-Type', example: 'application/json' },
            { key: 'Authorization', required: true, description: 'Access Token을 Bearer 토큰으로 사용', example: 'Bearer <access_token>' },
        ],
        queryParams: [],
        requestBody: [
            { key: 'comment', type: 'string', required: false, description: '다음 단계 요청 시 입력할 메시지' },
            { key: 'remove_company_stamp_mark', type: 'boolean', required: false, description: '회사 도장 워터마크 제거 여부' },
        ],
        responseFields: [
            { key: 'document_title', type: 'string', description: '문서 제목' },
            { key: 'document_status', type: 'string', description: '문서 상태' },
            { key: 'document_id', type: 'string', description: '문서 ID' },
        ],
        errorCodes: [
            { code: '4010001', message: 'Invalid or expired token.', description: '유효하지 않거나 만료된 토큰' },
            { code: '4010006', message: 'The refresh token has expired.', description: 'Refresh Token 만료' },
            { code: '4000001', message: 'Document not found.', description: '문서를 찾을 수 없음' },
            { code: '4030005', message: 'No permission.', description: '접근 권한 없음' },
        ],
    },
};

// ──────────────────────────────────────────────────────────────────────────
// API 명세 모달
// ──────────────────────────────────────────────────────────────────────────
let currentSpecTab = 'request';

function showSpecModal() {
    const ep = state.currentEndpoint;
    if (!ep) return;
    const spec = API_SPECS[ep.opaCode];

    // 헤더 정보 채우기
    $('#specModalTitle').text(`${ep.name}`);
    $('#specModalOpa').text(ep.opaCode || '');
    $('#specModalOpa').toggle(!!ep.opaCode);

    const methodColors = { GET: '#27ae60', POST: '#2980b9', PUT: '#e67e22', PATCH: '#8e44ad', DELETE: '#e74c3c' };
    const methodHtml = `<span style="font-family:monospace;font-weight:800;color:${methodColors[ep.method] || '#333'}">${ep.method}</span>`;
    $('#specModalPath').html(methodHtml + ' ' + ep.path);

    // 탭 초기화
    currentSpecTab = 'request';
    $('.spec-tab-btn').removeClass('active');
    $('[data-spec-tab="request"]').addClass('active');

    renderSpecContent(ep, spec);
    $('#specModal').addClass('open');
}

function renderSpecContent(ep, spec) {
    const $body = $('#specModalBody').empty();

    if (currentSpecTab === 'request') {
        // ── 헤더 ──
        const headers = (spec && spec.requestHeaders && spec.requestHeaders.length)
            ? spec.requestHeaders
            : (ep.defaultHeaders || []).map(h => ({ key: h.key, required: false, description: h.description, example: h.value }));
        $body.append(makeSpecSection('fa-heading', '요청 헤더 (Request Headers)', makeSpecTable(
            ['헤더', '필수', '설명', '예시'],
            headers.map(h => [
                `<span class="spec-field-key">${h.key}</span>`,
                reqBadge(h.required),
                `<span class="spec-desc">${h.description || ''}</span>`,
                h.example ? `<code style="font-size:0.78rem;color:#666">${h.example}</code>` : '',
            ])
        )));

        // ── Path 파라미터 ──
        const pathParams = ep.pathParams || [];
        if (pathParams.length) {
            $body.append(makeSpecSection('fa-route', 'Path 파라미터', makeSpecTable(
                ['파라미터', '필수', '설명'],
                pathParams.map(p => [
                    `<span class="spec-field-key">{${p.key}}</span>`,
                    reqBadge(p.required),
                    `<span class="spec-desc">${p.description || ''}</span>`,
                ])
            )));
        }

        // ── Query 파라미터 ──
        const qp = (spec && spec.queryParams) || ep.queryParams || [];
        if (qp.length) {
            $body.append(makeSpecSection('fa-question-circle', 'Query 파라미터', makeSpecTable(
                ['파라미터', '타입', '필수', '설명'],
                qp.map(p => [
                    `<span class="spec-field-key">${p.key}</span>`,
                    typeBadge(p.type),
                    reqBadge(p.required),
                    `<span class="spec-desc">${p.description || ''}</span>`,
                ])
            )));
        }

        // ── Request Body ──
        const body = (spec && spec.requestBody) || [];
        if (body.length) {
            $body.append(makeSpecSection('fa-file-code', 'Request Body', makeSpecTable(
                ['필드', '타입', '필수', '설명'],
                body.map(f => [
                    `<span class="spec-field-key">${f.key}</span>`,
                    typeBadge(f.type),
                    reqBadge(f.required),
                    `<span class="spec-desc">${f.description || ''}</span>`,
                ])
            )));
        } else if (!pathParams.length && !qp.length) {
            $body.append(`<p class="spec-empty">이 API는 추가 Request 파라미터가 없습니다.</p>`);
        }

    } else {
        // ── Response Fields ──
        const rf = (spec && spec.responseFields) || [];
        if (rf.length) {
            $body.append(makeSpecSection('fa-arrow-right-from-bracket', '응답 필드 (Success)', makeSpecTable(
                ['필드', '타입', '설명'],
                rf.map(f => [
                    `<span class="spec-field-key">${f.key}</span>`,
                    typeBadge(f.type),
                    `<span class="spec-desc">${f.description || ''}</span>`,
                ])
            )));
        }

        // ── Error Codes ──
        const errs = (spec && spec.errorCodes) || [];
        if (errs.length) {
            $body.append(makeSpecSection('fa-triangle-exclamation', '에러 코드', makeSpecTable(
                ['코드', '메시지', '설명'],
                errs.map(e => [
                    `<span class="spec-error-code">${e.code}</span>`,
                    `<span class="spec-error-msg">${e.message}</span>`,
                    `<span class="spec-desc">${e.description || ''}</span>`,
                ])
            )));
        }

        if (!rf.length && !errs.length) {
            $body.append(`<p class="spec-empty">명세 정보가 없습니다.</p>`);
        }
    }
}

function makeSpecSection(icon, title, content) {
    return $(`<div class="spec-section">
        <div class="spec-section-title"><i class="fa-solid ${icon} fa-xs"></i> ${title}</div>
    </div>`).append(content);
}

function makeSpecTable(headers, rows) {
    if (!rows.length) return $(`<p class="spec-empty">항목이 없습니다.</p>`);
    const $table = $(`<table class="spec-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table>`);
    const $tbody = $table.find('tbody');
    rows.forEach(cols => {
        $tbody.append(`<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`);
    });
    return $table;
}

function typeBadge(type) {
    const t = (type || 'string').toLowerCase();
    return `<span class="spec-type-badge spec-type-${t}">${t}</span>`;
}

function reqBadge(required) {
    return required
        ? `<span class="spec-required-badge spec-required-y">필수</span>`
        : `<span class="spec-required-badge spec-required-n">선택</span>`;
}

function closeSpecModal() {
    $('#specModal').removeClass('open');
}

function closeSpecOutside(e) {
    if ($(e.target).is('#specModal')) closeSpecModal();
}

// 탭 전환
$(document).on('click', '.spec-tab-btn', function() {
    currentSpecTab = $(this).data('spec-tab');
    $('.spec-tab-btn').removeClass('active');
    $(this).addClass('active');
    const ep = state.currentEndpoint;
    if (ep) renderSpecContent(ep, API_SPECS[ep.opaCode]);
});
