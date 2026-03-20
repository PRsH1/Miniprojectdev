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
        defaultBody: null
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
        defaultBody: null
    },
    {
        id: 'doc_create_external',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_007',
        name: '새 문서 작성 (외부)',
        method: 'POST',
        path: '/v2.0/api/documents/external',
        description: '외부자용 템플릿으로 새 문서를 작성합니다. Authorization 헤더에 Company API Key를 사용합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'company_id', description: '회사 ID', required: true, default: '' },
            { key: 'template_id', description: '외부용 템플릿 ID', required: true, default: '' },
        ],
        defaultBody: {
            document: {
                fields: [],
                recipients: [],
                parameters: [],
                notification: []
            }
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
        ],
        defaultBody: {
            type: '04',
            title_and_content: '',
            title: '',
            content: '',
            limit: '100',
            skip: '0'
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
        queryParams: [],
        defaultBody: { document_ids: [] }
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
                        step_type: '05',
                        step_seq: '2',
                        recipients: [
                            {
                                member: { name: '', id: '', sms: { country_code: '+82', phone_number: '' } },
                                use_mail: true,
                                use_sms: true
                            }
                        ],
                        comment: ''
                    }
                ]
            }
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
                { fields: [], recipients: [], parameters: [], notification: [], select_group_name: '' }
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
                { template_id: '', fields: [], recipients: [], parameters: [], notification: [] }
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
        defaultBody: { input: { document_ids: [] } }
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
        defaultBody: { document_ids: [], file_type: ['document', 'audit_trail'] }
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
        defaultBody: { step_seq: [] }
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
        defaultBody: null
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
        queryParams: [],
        defaultBody: null
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
                external_sso_info: { uuid: '', account_id: '' }
            }
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
        defaultBody: null
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
        queryParams: [],
        defaultBody: [
            { id: '', password: '', name: '', contact: { tel: '', number: '', country_number: '+82' }, department: '', position: '', role: [] }
        ]
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
        queryParams: [],
        defaultBody: null
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
        defaultBody: { group: { name: '', description: '', members: [] } }
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
        defaultBody: { group: { name: '', description: '', members: [] } }
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
        defaultBody: { group_ids: [] }
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
        defaultBody: null
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
        defaultBody: null
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
    if (ep.defaultBody && ['POST','PUT','PATCH'].includes(ep.method)) {
        $('#bodyEditor').val(JSON.stringify(ep.defaultBody, null, 2));
        $('[data-tab="body"]').click();
    } else {
        $('#bodyEditor').val('');
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

    // Fill path params from input values
    $('#paramsBody tr[data-type="path"]').each(function() {
        const key = $(this).find('.param-key').val();
        const val = $(this).find('.param-val').val();
        if (val) path = path.replace(`{${key}}`, val);
    });

    // Build query string from checked query params
    const qp = [];
    $('#paramsBody tr[data-type="query"]').each(function() {
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
    const $tbody = $('#paramsBody').empty();

    // Path params
    (ep.pathParams || []).forEach(p => {
        $tbody.append(makeParamRow('path', p.key, p.default || '', p.description, p.required, false));
    });

    // Query params
    (ep.queryParams || []).forEach(p => {
        $tbody.append(makeParamRow('query', p.key, p.default || '', p.description, p.required, true));
    });
}

function makeParamRow(type, key = '', value = '', desc = '', required = false, enabled = true, userAdded = false) {
    const typeBadge = type === 'path'
        ? '<span class="type-badge type-path">Path</span>'
        : '<span class="type-badge type-query">Query</span>';
    const readonlyKey = !userAdded ? 'readonly' : '';
    const disabledCheck = type === 'path' ? 'disabled checked' : (enabled ? 'checked' : '');
    const keyField = type === 'path'
        ? `<input class="kv-input param-key" value="${key}" ${readonlyKey}>`
        : `<input class="kv-input param-key" value="${key}" placeholder="키">`;
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';

    const $tr = $(`<tr data-type="${type}" data-user-added="${userAdded}">
        <td class="col-check"><input type="checkbox" class="param-enabled" ${disabledCheck}></td>
        <td class="col-type">${typeBadge}</td>
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
    const $tbody = $('#paramsBody');
    $tbody.append(makeParamRow('query', '', '', '', false, true, true));
    updateParamsBadge();
}

function removeRow(btn) {
    $(btn).closest('tr').remove();
    updateUrlPreview();
    updateParamsBadge();
}

function updateParamsBadge() {
    let count = 0;
    $('#paramsBody tr[data-type="path"]').each(function() {
        if ($(this).find('.param-val').val()) count++;
    });
    $('#paramsBody tr[data-type="query"]').each(function() {
        if ($(this).find('.param-enabled').is(':checked') && $(this).find('.param-key').val()) count++;
    });
    $('#paramsBadge').text(count);
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
async function sendRequest() {
    const url = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();
    if (!url) { showToast('URL이 비어있습니다'); return; }

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
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
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
        const text = await res.text();

        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = null; }

        // Status badge
        const statusClass = res.status >= 500 ? 'status-5xx'
            : res.status >= 400 ? 'status-4xx'
            : res.status >= 300 ? 'status-3xx' : 'status-2xx';
        $('#statusBadge').text(`${res.status} ${res.statusText}`).attr('class', `status-badge ${statusClass}`).show();
        $('#responseMeta').show();
        $('#responseTime').text(`${elapsed}ms`);
        $('#responseSize').text(formatBytes(text.length));
        $('#btnCopyResponse').show();
        $('#btnClearResponse').show();
        $('#responsePlaceholder').hide();

        // Render response
        const $pre = $('#responseBody').show();
        if (parsed !== null) {
            $pre.html(formatJsonSyntax(JSON.stringify(parsed, null, 2)));
        } else {
            $pre.text(text || '(응답 없음)');
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
