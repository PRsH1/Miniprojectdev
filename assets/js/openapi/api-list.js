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
