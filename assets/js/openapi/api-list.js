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
        saasBaseUrl: 'https://api.eformsign.com',
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
                    title: "유효하지 않은 서명 (4030004)",
                    body: {"code":"4030004","ErrorMessage":"The signature is invalid."}
                },
                {
                    title: "유효하지 않은 Body 데이터 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"The body data is invalid."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "execution_time 형식 오류 (long 타입 아님) (40000171)",
                    body: {"code":"40000171","ErrorMessage":"The execution_time is not of a long type."}, status: 400
                },
                {
                    title: "execution_time 필수 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Execution time(Request time) required."}, status: 400
                },
                {
                    title: "서명 유효 시간 만료 (4000002)",
                    body: {"code":"4000002","ErrorMessage":"The validation time has expired.","execution_time":"number"}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "Base64 디코딩 실패 (API Key 오류) (4030039)",
                    body: {"code":"4030039","ErrorMessage":"The apiKey encoded has an error."}, status: 400
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "존재하지 않는 계정 (4000150)",
                    body: {"code":"4000150","ErrorMessage":"The account does not exist."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
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
                    title: "refresh_token 값이 비어 있음 (파라미터 자체가 없으면 HTTP 400 code \"400\") (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Refresh token required."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "유효하지 않은 Refresh Token (4010002)",
                    body: {"code":"4010002","ErrorMessage":"The refresh_token is invalid."}, status: 401
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
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
                        { "recipient_type": "string", "id": "string", "name": "string", "email": "string", "sms": "string" }
                    ],
                    "step_group": "number",
                    "expired_date": "number",
                    "_expired": "boolean"
                },
                "fields": [
                    { "id": "string", "value": "string", "type": "string" }
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
                        "executor": { "id": "string", "name": "string" },
                        "executed_date": "number",
                        "step_group": "number"
                    }
                ],
                "histories": [
                    {
                        "step_type": "string",
                        "step_name": "string",
                        "action_type": "string",
                        "executor": { "recipient_type": "string", "id": "string", "name": "string" },
                        "executed_date": "number",
                        "comment": "string"
                    }
                ],
                "recipients": [
                    {
                        "name": "string",
                        "id": "string",
                        "sms": { "country_code": "string", "phone_number": "string" },
                        "token_id": "string",
                        "complete_token_id": "string",
                        "sms_template_index": "number"
                    }
                ],
                "detail_template_info": [
                    { "key": "string", "value": "string" }
                ]
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}, status: 400
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}, status: 400
                },
                {
                    title: "요청 문서 접근 권한 없음 (4000034)",
                    body: {"code":"4000034","ErrorMessage":"You have no access authority to the requested document."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "include_fields 사용 시 템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}, status: 400
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
            { key: 'file_type', description: '파일 유형 (필수): document / audit_trail / document,audit_trail', required: true, default: 'document,audit_trail' },
            { key: 'file_name', description: '다운로드 파일 이름 (확장자 자동 부착)', required: false, default: '' },
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: "문서 접근 권한 없음 (4030029)",
                    body: {"code":"4030029","ErrorMessage":"You do not have access to the document"}
                },
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}, status: 400
                },
                {
                    title: "문서 또는 감사증명서 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either the document or audit_trail must be selected."}, status: 400
                },
                {
                    title: "PDF 아직 생성 중 — 잠시 후 재시도 (2020001)",
                    body: {"code":"2020001","ErrorMessage":"The PDF is being generated. Please again try later."}, status: 400
                },
                {
                    title: "감사 PDF 미생성 — 문서 미완료 (2020001)",
                    body: {"code":"2020001","ErrorMessage":"The audit trail will be generated when the document is completed."}, status: 400
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
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
            { key: 'template_version', description: '템플릿 버전 (비우면 배포 버전)', required: false, default: '' },
        ],
        defaultBody: {
            document: {
                document_name: "",
                comment: "",
                recipients: [
                    {
                        step_type: "",
                        auth: {
                            password: "",
                            password_hint: "",
                            use_email_auth: null,
                            use_mobile_auth: null,
                            use_corporation_cert: null,
                            valid: { day: null, hour: null }
                        },
                        use_mail: null,
                        use_sms: null,
                        is_noti_ignore: null,
                        member: {
                            name: "",
                            id: "",
                            sms: { country_code: "", phone_number: "" }
                        },
                        business_num: "",
                        group: { id: "" },
                        hidden_sections: []
                    }
                ],
                referers: {
                    groups: [],
                    members: []
                },
                fields: [
                    { id: "", value: "" }
                ],
                parameters: [
                    { id: "", value: "" }
                ],
                select_group_name: "",
                notification: [
                    {
                        name: "",
                        email: "",
                        sms: { country_code: "", phone_number: "" },
                        auth: {
                            password: "",
                            password_hint: "",
                            mobile_verification: null,
                            valid: { day: null, hour: null }
                        }
                    }
                ]
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
                            sms: { country_code: "string", phone_number: "string" },
                            token_id: "string",
                            sms_template_index: "number"
                        }
                    }
                ]
            },
            errors: [
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "정형 문서 유형 아님 (4000310)",
                    body: {"code":"4000310","ErrorMessage":"The document is not a structured type."}, status: 400
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}, status: 400
                },
                {
                    title: "대면 서명 설정으로 문서 생성 불가 (4000241)",
                    body: {"code":"4000241","ErrorMessage":"No document can be created because the In-person signer option is set in the Start step of this template."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "파일 없음 (4000087)",
                    body: {"code":"4000087","ErrorMessage":"No file exists."}
                },
                {
                    title: "접근 불가 도메인 (URL 문서 작성 미설정) (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}, status: 400
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "워크플로우 다음 단계 설정 불일치 (4000012)",
                    body: {"code":"4000012","ErrorMessage":"The next_steps set by the user is inconsistent with the template's workflow settings."}
                },
                {
                    title: "대면 서명 단계에는 멤버만 지정 가능 (400242)",
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}, status: 400
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}, status: 400
                },
                {
                    title: "참조자(CC) JSON 형식 오류 (4000190)",
                    body: {"code":"4000190","ErrorMessage":"The input value for the CC is in an invalid JSON format."}, status: 400
                },
                {
                    title: "문서 제목 변경 불가 템플릿 (4000010)",
                    body: {"code":"4000010","ErrorMessage":"This document's title cannot be changed."}, status: 400
                },
                {
                    title: "파일 IO 오류 (5000038)",
                    body: {"code":"5000038","ErrorMessage":"File IO error."}, status: 500
                },
                {
                    title: "문서 생성 실패 (5000004)",
                    body: {"code":"5000004","ErrorMessage":"Failed to create the document."}, status: 500
                },
                {
                    title: "선불 문서 소진 (4000201)",
                    body: {"code":"4000201","ErrorMessage":"You have exhausted all purchased documents"}, status: 400
                },
                {
                    title: "선불 크레딧 소진 (4000308)",
                    body: {"code":"4000308","ErrorMessage":"You have exhausted all purchased credits."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "우편번호 필드 형식 오류 (4000338)",
                    body: {"code":"4000338","ErrorMessage":"Invalid zip code format."}, status: 400
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
        queryParams: [
            { key: 'doc_without_attachments', description: 'true면 첨부를 뺀 문서 PDF(<제목>_not_attached.pdf)도 ZIP에 포함 (기본 false)', required: false, default: '' },
            { key: 'ozsign_to_png', description: 'true면 .ozsign 서명 파일을 PNG로 변환 (기본 false)', required: false, default: '' },
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "첨부 파일 없음 (doc_without_attachments=false일 때) (4000065)",
                    body: {"code":"4000065","ErrorMessage":"Failed to get the resource."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
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
                send_external_pdf: {
                    email: "",
                    sms: { country_code: "", phone_number: "" },
                    auth: { password: "", password_hint: "" }
                },
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
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "정형 문서 유형 아님 (4000310)",
                    body: {"code":"4000310","ErrorMessage":"The document is not a structured type."}, status: 400
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}, status: 400
                },
                {
                    title: "대면 서명 설정으로 문서 생성 불가 (4000241)",
                    body: {"code":"4000241","ErrorMessage":"No document can be created because the In-person signer option is set in the Start step of this template."}, status: 400
                },
                {
                    title: "파일 없음 (4000087)",
                    body: {"code":"4000087","ErrorMessage":"No file exists."}
                },
                {
                    title: "접근 불가 도메인 (URL 문서 작성 미설정) (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}, status: 400
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "워크플로우 다음 단계 설정 불일치 (4000012)",
                    body: {"code":"4000012","ErrorMessage":"The next_steps set by the user is inconsistent with the template's workflow settings."}
                },
                {
                    title: "대면 서명 단계에는 멤버만 지정 가능 (400242)",
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}, status: 400
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "외부자 작성이 허용되지 않은 템플릿 (4000044)",
                    body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}, status: 400
                },
                {
                    title: "외부 수신자의 use_mail·use_sms가 모두 false (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (Authorization 형식 오류 포함) (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "API Key Base64 디코딩 실패 (URL-safe Base64로 디코딩) (4030039)",
                    body: {"code":"4030039","ErrorMessage":"The apiKey encoded has an error."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
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
                                { "recipient_type": "string", "id": "string", "name": "string", "email": "string", "sms": "string" }
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
                {
                    title: "type 누락 또는 01~04가 아님 (5000089)",
                    body: {"code":"5000089","ErrorMessage":"Invalid document inbox type."}, status: 400
                },
                {
                    title: "template_ids·creator_infos가 배열이 아님 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "limit·skip이 숫자가 아님 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 400
                },
                {
                    title: "type 04(문서 관리)를 관리자·문서 관리자가 아닌 멤버가 요청 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "검색 엔진 연결 실패 (5000091)",
                    body: {"code":"5000091","ErrorMessage":"No search engine found."}, status: 500
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
        defaultBody: { document_ids: [""], comment: "" },
        exampleResponse: {
            success: {
                "result": {
                    "success_result": ["string"],
                    "fail_result": [
                        { "document_id": "string", "code": "string", "message": "string" }
                    ]
                },
                "code": "-1",
                "message": "Completed.",
                "status": "200"
            },
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "document_ids 키 누락 (사유 필수 설정이면 comment 누락 포함) (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 400
                },
                {
                    title: "삭제 사유 필수 — 10자 이상 (4000326)",
                    body: {"code":"4000326","ErrorMessage":"Document delete reason is required. Please enter a delete reason of at least 10 characters."}, status: 400
                },
                {
                    title: "삭제 사유 255자 초과 (4000327)",
                    body: {"code":"4000327","ErrorMessage":"The length of the delete reason is too long. The maximum length is 255 characters."}, status: 400
                }
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
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "워크플로우 다음 단계 설정 불일치 (4000012)",
                    body: {"code":"4000012","ErrorMessage":"The next_steps set by the user is inconsistent with the template's workflow settings."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                },
                {
                    title: "대면 서명 단계에는 멤버만 지정 가능 (400242)",
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}, status: 400
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "이미 진행된 문서 (4000029)",
                    body: {"code":"4000029","ErrorMessage":"This document has already proceeded."}, status: 400
                }
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
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}, status: 400
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "워크플로우 다음 단계 설정 불일치 (4000012)",
                    body: {"code":"4000012","ErrorMessage":"The next_steps set by the user is inconsistent with the template's workflow settings."}
                },
                {
                    title: "대면 서명 단계에는 멤버만 지정 가능 (400242)",
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}, status: 400
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}, status: 400
                },
                {
                    title: "참조자(CC) JSON 형식 오류 (4000190)",
                    body: {"code":"4000190","ErrorMessage":"The input value for the CC is in an invalid JSON format."}, status: 400
                },
                {
                    title: "문서 제목 변경 불가 템플릿 (4000010)",
                    body: {"code":"4000010","ErrorMessage":"This document's title cannot be changed."}, status: 400
                },
                {
                    title: "선불 크레딧 소진 (4000308)",
                    body: {"code":"4000308","ErrorMessage":"You have exhausted all purchased credits."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "구매한 문서 건수 소진 (4000201)",
                    body: {"code":"4000201","ErrorMessage":"You have exhausted all purchased documents"}, status: 400
                },
                {
                    title: "일괄 작성 문서 수 한도 초과 (4000276)",
                    body: {"code":"4000276","ErrorMessage":"Document limit exceeded"}, status: 400
                },
                {
                    title: "동적 필드가 있는 템플릿은 일괄 작성 불가 (4030051)",
                    body: {"code":"4030051","ErrorMessage":"You cannot bulk send documents from templates containing dynamic fields."}, status: 400
                }
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
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: { "code": "4010001", "ErrorMessage": "Invalid or expired token." }, status: 401 },
                { title: 'Refresh Token 만료 (4010006)', body: { "code": "4010006", "ErrorMessage": "The refresh token has expired." }, status: 401 },
                { title: '필수 입력값 누락 (4000001)', body: { "code": "4000001", "ErrorMessage": "Required input value not found." } },
                { title: '템플릿 없음 (4000046)', body: { "code": "4000046", "ErrorMessage": "There is no template." } },
                { title: '워크플로우 다음 단계 설정 불일치 (4000012)', body: { "code": "4000012", "ErrorMessage": "The next_steps set by the user is inconsistent with the template's workflow settings." } }
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
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "활성화된 API Key 멤버 없음 (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The member does not exist."}, status: 400
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}, status: 400
                },
                {
                    title: "비정형 문서 유형 아님 (4000179)",
                    body: {"code":"4000179","ErrorMessage":"The document is not an unstructured type."}, status: 400
                },
                {
                    title: "임시 저장 상태 아님 — 다음 단계 처리 불가 (4000180)",
                    body: {"code":"4000180","ErrorMessage":"The document status is not draft."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
    {
        id: 'company_send_pdf',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_037',
        name: '일괄 완료 문서 PDF 전송',
        method: 'POST',
        path: '/v2.0/api/companies/{company_id}/send_multiple_completed_document',
        description: '완료된 문서의 PDF를 여러 수신자에게 일괄 전송합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'company_id', description: '회사 ID (서버는 토큰의 회사를 사용)', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            input: {
                send_pdfs: [
                    {
                        document_id: '',
                        pdf_send_infos: [
                            {
                                name: '',
                                method: '',
                                method_info: '',
                                code: '',
                                is_use_alim_talk: null,
                                send_pdf_option: {
                                    auth_pwd: '',
                                    auth_hint: '',
                                    use_mobile_auth: null,
                                    use_email_sms_auth: null,
                                    attach_audit_pdf: null,
                                    use_attach_link: null
                                }
                            }
                        ]
                    }
                ],
                comment: ''
            }
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string"
            },
            errors: [
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "유효하지 않은 문서 유형 (4000081)",
                    body: {"code":"4000081","ErrorMessage":"Invalid document type."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "한국·일본 외 체험(Trial) 회사는 전송 불가 (4030057)",
                    body: {"code":"4030057","ErrorMessage":"You do not have permission."}, status: 400
                }
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
        description: '진행 중인 문서를 취소합니다. 취소 권한: 대표 관리자, 문서 취소 권한이 부여된 문서 관리자, 문서 작성자.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            input: {
                document_ids: [''],
                comment: ''
            }
        },
        exampleResponse: {
            success: {
                "result": {
                    "success_result": ["string"],
                    "fail_result": []
                }
            },
            errors: [
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "input 래퍼 없음 또는 JSON 형식 오류 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 400
                }
            ]
        }
    },
    {
        id: 'doc_integrated_approval',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_043',
        name: '통합 결재 승인',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/send_external_approval',
        description: '통합 결재 중인 문서를 승인하여 다음 단계로 진행합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            executor_id: '',
            executor_name: '',
            comment: ''
        },
        exampleResponse: {
            success: {
                "document_id": "string",
                "document_title": "string",
                "document_status": "string",
                "code": "-1"
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "이미 처리된 문서 (4000029)",
                    body: {"code":"4000029","ErrorMessage":"This document has already proceeded."}
                },
                {
                    title: "문서 진행 정보 없음 (5000071)",
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}, status: 400
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}, status: 400
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "템플릿 단계 없음 (4000073)",
                    body: {"code":"4000073","ErrorMessage":"No step settings information exists."}, status: 500
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
    {
        id: 'doc_integrated_decline',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_044',
        name: '통합 결재 반려',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/decline_external_approval',
        description: '통합 결재 중인 문서를 반려하여 이전 상태로 되돌립니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            executor_id: '',
            executor_name: '',
            comment: ''
        },
        exampleResponse: {
            success: {
                "document_id": "string",
                "document_title": "string",
                "document_status": "string",
                "code": "-1"
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "이미 처리된 문서 (4000029)",
                    body: {"code":"4000029","ErrorMessage":"This document has already proceeded."}
                },
                {
                    title: "문서 진행 정보 없음 (5000071)",
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}, status: 400
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
        description: '여러 문서 파일을 한 번에 ZIP으로 다운로드합니다(최대 20개). 성공 응답은 ZIP 바이너리이고, 권한 없음·없는 문서·PDF 생성 중 같은 문서별 오류는 HTTP 200 JSON {"<document_id>": "<오류 메시지>"}로 돌아옵니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            document_ids: [''],
            file_type: [''],
            zip_password: '',
            file_name: '',
            use_simple_file_name: null
        },
        exampleResponse: {
            errors: [
                {
                    title: "document_ids 또는 file_type 키 누락 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "문서 20개 초과 (4000222)",
                    body: {"code":"4000222","ErrorMessage":"Document download limit exceeded."}, status: 400
                },
                {
                    title: "문서 접근 권한 없음 (4030029)",
                    body: {"code":"4030029","ErrorMessage":"You do not have access to the document"}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                }
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
        description: '완료된 문서의 step_seq에 따라 완료 토큰 기한을 연장합니다. 연장 기한은 API 요청일로부터 15일입니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '완료된 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: { step_seq: [] },
        exampleResponse: {
            success: {
                "complete_tokens": [
                    {
                        "complete_token_id": "string",
                        "step_seq": "number",
                        "expired_date": "number"
                    }
                ]
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}, status: 400
                },
                {
                    title: "문서 미완료 — 완료 토큰 갱신 실패 (4000036)",
                    body: {"code":"4000036","ErrorMessage":"This document is not completed."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "요청 문서 접근 권한 없음 (4000034)",
                    body: {"code":"4000034","ErrorMessage":"You have no access authority to the requested document."}, status: 400
                }
            ]
        }
    },

    {
        id: 'doc_internal_decline',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_047',
        name: '내부자 반려',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/decline',
        description: '문서를 반려하여 이전 상태로 되돌립니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '반려할 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            previous_steps: [],
            comment: ''
        },
        exampleResponse: {
            success: {
                "document_title": "string",
                "code": "string",
                "document_status": "string",
                "document_id": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "문서 진행 정보 없음 (5000071)",
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}, status: 400
                },
                {
                    title: "요청 문서 접근 권한 없음 (4000034)",
                    body: {"code":"4000034","ErrorMessage":"You have no access authority to the requested document."}
                },
                {
                    title: "워크플로우 다음 단계 설정 불일치 (4000012)",
                    body: {"code":"4000012","ErrorMessage":"The next_steps set by the user is inconsistent with the template's workflow settings."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "이미 삭제된 문서 (4000031)",
                    body: {"code":"4000031","ErrorMessage":"This document has already been deleted."}, status: 400
                },
                {
                    title: "삭제 요청된 문서 (4000030)",
                    body: {"code":"4000030","ErrorMessage":"This document has already been requested to be deleted."}, status: 400
                },
                {
                    title: "이미 무효화된 문서 (4000166)",
                    body: {"code":"4000166","ErrorMessage":"This document has already been voided."}, status: 400
                },
                {
                    title: "무효화 요청된 문서 (4000167)",
                    body: {"code":"4000167","ErrorMessage":"This document has already been requested to be voided."}, status: 400
                },
                {
                    title: "수정 중인 문서 (4000168)",
                    body: {"code":"4000168","ErrorMessage":"This document is being corrected."}, status: 400
                },
                {
                    title: "이미 완료된 문서 (4000035)",
                    body: {"code":"4000035","ErrorMessage":"This document has already been completed."}, status: 400
                }
            ]
        }
    },
    {
        id: 'doc_external_decline',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: 'OPA2_048',
        name: '외부자 반려',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/external_decline',
        description: '외부자가 문서를 반려하여 이전 상태로 되돌립니다. Authorization 헤더에 Company API Key(Base64 인코딩)를 Bearer 토큰으로 사용합니다.',
        requiresAuth: false,
        pathParams: [
            { key: 'document_id', description: '반려할 문서 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'company_id', description: '회사 ID', required: true, default: '' },
            { key: 'outside_token', description: '외부자 토큰', required: true, default: '' }
        ],
        defaultHeaders: [
            { key: 'Authorization', value: 'Bearer {base64_encoded_api_key}', description: 'Company API Key를 Base64 인코딩한 값 (인증 패널의 Access Token이 아닌 회사 API Key 사용)' }
        ],
        defaultBody: {
            comment: ''
        },
        exampleResponse: {
            success: {
                "document_title": "string",
                "code": "string",
                "document_status": "string",
                "document_id": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "외부자 문서 요청 정보 없음 (5000076)",
                    body: {"code":"5000076","ErrorMessage":"The non-member request info does not exist."}, status: 400
                },
                {
                    title: "이미 처리된 문서 (4000029)",
                    body: {"code":"4000029","ErrorMessage":"This document has already proceeded."}
                },
                {
                    title: "outside_token 불일치·만료 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "Base64 디코딩 실패 (API Key 오류) (4030039)",
                    body: {"code":"4030039","ErrorMessage":"The apiKey encoded has an error."}, status: 400
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "이미 삭제된 문서 (4000031)",
                    body: {"code":"4000031","ErrorMessage":"This document has already been deleted."}, status: 400
                },
                {
                    title: "삭제 요청된 문서 (4000030)",
                    body: {"code":"4000030","ErrorMessage":"This document has already been requested to be deleted."}, status: 400
                },
                {
                    title: "이미 무효화된 문서 (4000166)",
                    body: {"code":"4000166","ErrorMessage":"This document has already been voided."}, status: 400
                },
                {
                    title: "무효화 요청된 문서 (4000167)",
                    body: {"code":"4000167","ErrorMessage":"This document has already been requested to be voided."}, status: 400
                },
                {
                    title: "수정 중인 문서 (4000168)",
                    body: {"code":"4000168","ErrorMessage":"This document is being corrected."}, status: 400
                },
                {
                    title: "이미 완료된 문서 (4000035)",
                    body: {"code":"4000035","ErrorMessage":"This document has already been completed."}, status: 400
                }
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
        queryParams: [
            { key: 'category', description: '템플릿 카테고리로 필터 (비우면 전체)', required: false, default: '' },
        ],
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
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "템플릿 접근 권한 없음 (4000044)",
                    body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}, status: 400
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "유효하지 않은 템플릿 요청 상태 (4000264)",
                    body: {"code":"4000264","ErrorMessage":"The form request state is not valid."}, status: 500
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },

    {
        id: 'template_image_download',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: 'OPA2_041',
        name: '템플릿 이미지 다운로드',
        method: 'GET',
        path: '/v2.0/api/template_image/{template_image_id}',
        description: '템플릿 이미지를 다운로드합니다. template_image_id는 템플릿 정보 조회 API의 form_image_id 필드 값입니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'template_image_id', description: '템플릿 이미지 ID (템플릿 정보 조회의 form_image_id)', required: true, default: '' }
        ],
        queryParams: [
            { key: 'output_type', description: '반환 타입. 1이면 저장된 원본 이미지 파일 그대로, 미입력·다른 값이면 data URI 문자열(data:image/<확장자>;base64,...)', required: false, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "존재하지 않는 template_image_id (4000087)",
                    body: {"code":"4000087","ErrorMessage":"No file exists."}, status: 400
                }
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
            { key: 'member_all', description: 'true면 비활성 멤버까지 포함 (default: false — 활성·초대 멤버만)', required: false, default: '' },
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
                        "role_code": "number",
                        "group": ["string"],
                        "group_list": [
                            { "id": "string", "name": "string" }
                        ],
                        "ecr_uid": "string",
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
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
            { key: 'mailOption', description: '초대 메일 발송 여부 (true/false — 파라미터를 빼면 서버 기본값 true)', required: false, default: 'false' },
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
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "account·account.id 누락(HTTP 500) / 이름 누락, 이메일이 아닌 ID에 contact 누락(HTTP 400) (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "멤버 수 초과로 초대 실패 (4000118)",
                    body: {"code":"4000118","ErrorMessage":"Cannot send the invitation as the maximum number of members has been reached."}, status: 400
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "아이디 또는 비밀번호 오류 (4000139)",
                    body: {"code":"4000139","ErrorMessage":"Invalid id or password."}, status: 400
                },
                {
                    title: "이미 존재하는 멤버 ID (4000135)",
                    body: {"code":"4000135","ErrorMessage":"This ID is already taken."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
        description: '멤버 정보를 수정합니다. PATCH지만 사실상 전체 교체입니다 — enabled를 빼면 비활성화(초대 상태 멤버는 제외), role을 빼면 회사·템플릿 관리자 권한 해제(요청자가 회사 관리자이거나 대상이 대표 관리자인데 회사 관리자 권한이 바뀌게 되면 4000125), department·position·contact.number·tel·email을 빼면 빈 값으로 지워집니다. 현재 값을 먼저 조회(OPA2_010)해 함께 보내세요. account.id는 경로의 멤버 ID와 같아야 합니다.',
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
                contact: { number: '', tel: '', email: '', country_number: '' },
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
                {
                    title: "account 키 없음 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 400
                },
                {
                    title: "account.id·name·contact 누락 또는 account.id ≠ 경로 ID (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "대표 관리자 비활성화·관리자 권한 변경 불가 (4000125)",
                    body: {"code":"4000125","ErrorMessage":"Administrator accounts cannot be deactivated."}, status: 400
                },
                {
                    title: "플랜 제한으로 멤버 활성화 실패 (4000126)",
                    body: {"code":"4000126","ErrorMessage":"Cannot activate the member as the maximum number of members allowed has been reached."}, status: 400
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}, status: 400
                },
                {
                    title: "멤버 이메일 변경 실패 (4030041)",
                    body: {"code":"4030041","ErrorMessage":"This email is already in use. Please enter another email."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "존재하지 않거나 삭제된 멤버 (4000149)",
                    body: {"code":"4000149","ErrorMessage":"No such member exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 계정 (4000150)",
                    body: {"code":"4000150","ErrorMessage":"The account does not exist."}
                },
                {
                    title: "DB 연결 실패 (5000002)",
                    body: {"code":"5000002","ErrorMessage":"Failed to connect to CouchDB."}, status: 500
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "요청 배열 1000건 초과 (4000118)",
                    body: {"code":"4000118","ErrorMessage":"Cannot send the invitation as the maximum number of members has been reached."}, status: 400
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
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "group.name 또는 group.description 키 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "이미 존재하는 그룹 이름 (4000122)",
                    body: {"code":"4000122","ErrorMessage":"The group name is already in use."}, status: 400
                },
                {
                    title: "그룹 이름 비워둘 수 없음 (4000249)",
                    body: {"code":"4000249","ErrorMessage":"The group name is cannot be empty"}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
        description: '그룹 정보를 수정합니다. 사실상 전체 교체입니다 — group.name·group.description 키는 필수(""면 설명이 지워짐)이고, members를 빼면 기존 멤버가 모두 제거됩니다.',
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
                {
                    title: "group.name 또는 group.description 키 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 그룹 (4000123)",
                    body: {"code":"4000123","ErrorMessage":"The group does not exist."}, status: 400
                },
                {
                    title: "이미 존재하는 그룹 이름 (4000122)",
                    body: {"code":"4000122","ErrorMessage":"The group name is already in use."}, status: 400
                },
                {
                    title: "그룹 이름 비워둘 수 없음 (4000249)",
                    body: {"code":"4000249","ErrorMessage":"The group name is cannot be empty"}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "존재하지 않는 회사 도장 (4000175)",
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "존재하지 않는 회사 도장 (4000175)",
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "company_stamp·name·description·stamp·stamp.path 키 누락 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "stamp.path가 data URI(;base64,)가 아니거나 이름이 공백뿐 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}, status: 500
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "category 255자 초과 또는 auth_details 값 128자 초과 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "이미 존재하는 회사 도장 이름 (4000174)",
                    body: {"code":"4000174","ErrorMessage":"This name has already been used for another stamp."}, status: 400
                },
                {
                    title: "회사 도장 최대 업로드 크기 초과 (4130002)",
                    body: {"code":"4130002","ErrorMessage":"The file has exceeded the maximum size."}, status: 500
                },
                {
                    title: "유효하지 않은 회사 도장 이미지 (4000231)",
                    body: {"code":"4000231","ErrorMessage":"Invalid company stamp image data."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
        description: '회사 도장 정보를 수정합니다. PATCH지만 전체 교체입니다 — name·description·stamp.path 키가 필요하고(path가 ""면 기존 이미지 유지), auth를 빼면 전체 멤버 허용으로, description·category를 빼면 빈 값으로 바뀝니다.',
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
                {
                    title: "company_stamp·name·description·stamp·stamp.path 키 누락 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "stamp.path가 data URI(;base64,)가 아니거나 이름이 공백뿐 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}, status: 500
                },
                {
                    title: "존재하지 않는 회사 도장 (4000175)",
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}, status: 400
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "이미 존재하는 회사 도장 이름 (4000174)",
                    body: {"code":"4000174","ErrorMessage":"This name has already been used for another stamp."}, status: 400
                },
                {
                    title: "회사 도장 최대 업로드 크기 초과 (4130002)",
                    body: {"code":"4130002","ErrorMessage":"The file has exceeded the maximum size."}, status: 500
                },
                {
                    title: "유효하지 않은 회사 도장 이미지 (4000231)",
                    body: {"code":"4000231","ErrorMessage":"Invalid company stamp image data."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
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
                {
                    title: "존재하지 않는 회사 도장 (4000175)",
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
    {
        id: 'company_use_status',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_046',
        name: '이용현황 조회',
        method: 'GET',
        path: '/v2.0/api/companies/{company_id}/use_status',
        description: '년, 월별 이용현황을 조회합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'company_id', description: '회사 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'term', description: 'yearly: 연간 조회 / monthly: 월간 조회 (기본값: monthly)', required: false, default: 'monthly' },
            { key: 'date', description: '조회 기한 (월간: 6자리 ex)202305 / 연간: 4자리 ex)2023)', required: false, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "total": "number",
                "use_template": [
                    {
                        "id": "string",
                        "value": "number"
                    }
                ],
                "auth": {
                    "tsa": "number",
                    "sms": "number",
                    "mobile_auth": "number",
                    "alimtalk": "number",
                    "sms_pincode": "number",
                    "corporation_cert": "number"
                },
                "term": [
                    {
                        "month": "string",
                        "count": "number"
                    }
                ]
            },
            errors: [
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "term이 monthly·yearly가 아님 (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}, status: 400
                },
                {
                    title: "잘못된 날짜 형식 (4000013)",
                    body: {"code":"4000013","ErrorMessage":"The date format is invalid."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
    {
        id: 'doc_manager_settings',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_049',
        name: '문서 관리 조건 목록 조회',
        method: 'POST',
        path: '/v2.0/api/document_manager_settings',
        description: '문서 관리자의 관리 문서 조건 목록을 조회합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            skip: null,
            limit: null,
            search_keyword: ''
        },
        exampleResponse: {
            success: {
                "result": {
                    "total_rows": "number",
                    "document_manager_settings": [
                        {
                            "manager_type": "string",
                            "manager_id": "string",
                            "manager_account_id": "string",
                            "manager_name": "string",
                            "withdrawal": "boolean",
                            "document_roles": [
                                {
                                    "deletable": "boolean",
                                    "revokable": "boolean",
                                    "document_creators": [
                                        {
                                            "creator_type": "string",
                                            "creator_id": "string",
                                            "creator_name": "string",
                                            "creator_account_id": "string",
                                            "creator_department": "string"
                                        }
                                    ],
                                    "document_types": [
                                        {
                                            "form_type": "string",
                                            "form_id": "string",
                                            "form_name": "string"
                                        }
                                    ],
                                    "detail_creators": [
                                        {
                                            "field_name": "string",
                                            "search_type": "string",
                                            "value": "string"
                                        }
                                    ],
                                    "detail_form_datas": [
                                        {
                                            "field_name": "string",
                                            "search_type": "string",
                                            "value": "string",
                                            "start_value": "string",
                                            "end_value": "string"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                "code": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "대표 관리자·회사 관리자가 아님 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "토큰의 멤버가 회사에 없거나 비활성·삭제됨 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                }
            ]
        }
    },
    {
        id: 'doc_manager_add',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_050',
        name: '문서 관리자 추가',
        method: 'POST',
        path: '/v2.0/api/document_manager',
        description: '문서 관리자를 추가합니다. 한 번에 여러 명을 추가할 수 있습니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            managers: [
                { type: '', id: '', account_id: '' }
            ]
        },
        exampleResponse: {
            success: {
                "result": [
                    {
                        "type": "string",
                        "id": "string",
                        "account_id": "string"
                    }
                ],
                "code": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "대표 관리자·회사 관리자가 아님 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "토큰의 멤버가 회사에 없거나 비활성·삭제됨 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "managers가 비었거나 type·id 오류 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                }
            ]
        }
    },
    {
        id: 'doc_manager_delete',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_051',
        name: '문서 관리자 삭제',
        method: 'DELETE',
        path: '/v2.0/api/document_manager',
        description: '문서 관리자를 삭제합니다. 한 번에 여러 명을 삭제할 수 있습니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            managers: [
                { type: '', id: '', account_id: '' }
            ]
        },
        exampleResponse: {
            success: {
                "result": [
                    {
                        "type": "string",
                        "id": "string",
                        "account_id": "string"
                    }
                ],
                "code": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "대표 관리자·회사 관리자가 아님 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "토큰의 멤버가 회사에 없거나 비활성·삭제됨 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "managers가 비었거나 type·id 오류 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}, status: 400
                }
            ]
        }
    },
    {
        id: 'doc_manager_roles_set',
        group: '회사',
        groupIcon: 'fa-building',
        opaCode: 'OPA2_052',
        name: '문서 관리자 관리 문서 설정',
        method: 'POST',
        path: '/v2.0/api/document_manager_roles',
        description: '문서 관리자의 관리 문서 조건을 설정합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            manager_type: '',
            manager_id: '',
            document_roles: [
                {
                    deletable: null,
                    revokable: null,
                    document_creators: [
                        { creator_type: '', creator_id: '' }
                    ],
                    document_types: [
                        { form_type: '', form_id: '' }
                    ],
                    detail_creators: [
                        { field_name: '', search_type: '', value: '' }
                    ],
                    detail_form_datas: [
                        { field_name: '', search_type: '', value: '', start_value: '', end_value: '' }
                    ]
                }
            ]
        },
        exampleResponse: {
            success: {
                "code": "string",
                "message": "string",
                "status": "string"
            },
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "토큰의 멤버가 회사에 없음·비활성 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "manager_id·creator_id의 멤버를 찾을 수 없음 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 500
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "대표 관리자·회사 관리자가 아님 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "토큰의 멤버가 회사에 없거나 비활성·삭제됨 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "필수 키 누락·값 형식 오류(document_roles null, creator_type·form_type 등) (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500
                },
                {
                    title: "문서 관리자 설정 정보 없음 (4000197)",
                    body: {"code":"4000197","ErrorMessage":"The document manager settings information does not exist."}, status: 500
                }
            ]
        }
    },

    // ──────────────────────────────────────────────────────────────────────
    // OPA2_061
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'template_single_info',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: 'OPA2_061',
        name: '단일 템플릿 정보 조회',
        method: 'GET',
        path: '/v2.0/api/forms/{form_id}',
        description: '내부 멤버의 작성 가능한 단일 템플릿 정보를 조회합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'form_id', description: '조회할 템플릿 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'is_include_config', description: 'config 정보 포함 여부', required: false, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
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
                "config": {
                    "parameters": {
                        "inputs": [],
                        "outputs": [
                            {
                                "name": "string",
                                "type": "string",
                                "desc": "string",
                                "form_index": "number"
                            }
                        ],
                        "default_input_controls": [
                            {
                                "name": "string",
                                "input_type": "string",
                                "accessible": "boolean",
                                "required": "boolean",
                                "used": "boolean",
                                "section": "string",
                                "data_type": "string"
                            }
                        ],
                        "dataset_list": [],
                        "sections": ["string"]
                    },
                    "display_settings": [
                        {
                            "seq": "number",
                            "name": "string",
                            "display_name": "string",
                            "displayable": "boolean",
                            "form_index": "number"
                        }
                    ],
                    "step_settings": [
                        {
                            "seq": "number",
                            "step_group": "number",
                            "name": "string",
                            "type": "string",
                            "numbering": "boolean",
                            "inperson": "boolean",
                            "inperson_monitor": "boolean",
                            "option": {},
                            "alert_option": {},
                            "input_control_option": [],
                            "_internal_only": "boolean"
                        }
                    ],
                    "input_form_parameters": [],
                    "input_component_parameters": [],
                    "external_access": {
                        "is_external_access": "boolean",
                        "access_datas": [],
                        "search_conditions": []
                    },
                    "notification": {
                        "internal_recipient": {},
                        "external_recipient": {},
                        "processing_status": {},
                        "processing_request": {}
                    }
                },
                "enabled": "boolean",
                "form_modify_auth": "boolean",
                "title_change": "boolean",
                "quick_processing": "boolean",
                "form_doc_retention_period": {
                    "period": "number",
                    "use_period": "boolean",
                    "period_type": "string"
                },
                "availableDeleteDraft": "boolean"
            },
            errors: [
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "템플릿 접근 권한 없음 (4000044)",
                    body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}, status: 400
                },
                {
                    title: "비활성화된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"Cannot create a document because the template has been deactivated."}, status: 400
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}, status: 400
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}, status: 400
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}, status: 400
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}, status: 403
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}, status: 401
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}, status: 401
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}, status: 401
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}, status: 401
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}, status: 403
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}, status: 403
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
    // ──────────────────────────────────────────────────────────────────────
    // Full 전용 (대고객 공개 검토 전) — opaCode 없음, sourceApiId = SaaS 소스 내부 번호(참고용)
    // 공개판(Prod)은 fullOnly 항목을 화면에서 제거한다. 그룹 표시 순서상 각 그룹 끝에 붙는다.
    // ──────────────────────────────────────────────────────────────────────
    {
        id: 'doc_component_values',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_060',
        fullOnly: true,
        name: '문서 컴포넌트 값 조회',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/document_component',
        description: '문서에서 지정한 컴포넌트(필드) 이름의 현재 값을 조회합니다. 요청·응답 키가 camelCase입니다(documentComponentBodyList). 문서에 없는 이름은 결과에서 빠집니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '조회할 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            documentComponentBodyList: [
                {
                    name: ''
                }
            ]
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": {
                    "documentComponentList": [
                        {
                            "name": "string",
                            "value": "string"
                        }
                    ]
                }
            },
            errors: [
                { title: 'documentComponentBodyList 누락·빈 목록 (4000001)', body: {"code":"4000001","ErrorMessage":"Required input value not found."}, status: 400 },
                { title: '존재하지 않는 문서 (4000004)', body: {"code":"4000004","ErrorMessage":"The document does not exist."}, status: 400 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 },
                { title: '삭제된 회사 (4000076)', body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}, status: 403 },
                { title: '이용 정지된 회사 (4030052)', body: {"code":"4030052","ErrorMessage":"The company has been suspended."}, status: 403 }
            ]
        }
    },
    {
        id: 'doc_complete_attach_list',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_057',
        fullOnly: true,
        name: '완료 문서 첨부 파일 목록 조회',
        method: 'GET',
        path: '/v2.0/api/document_complete_attachment_list',
        description: '완료 문서에 추가로 업로드한 첨부 파일(완료 문서 파일 첨부) 목록을 조회합니다. 응답 키가 camelCase입니다. 업로드 API는 multipart라 테스터에 없습니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'document_id', description: '문서 ID', required: true, default: '' },
            { key: 'document_status', description: '문서 상태 (서버 필수 파라미터 — 현재 조회 조건에는 쓰이지 않음)', required: true, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": [
                    {
                        "fileId": "string",
                        "fileName": "string",
                        "fileType": "string",
                        "uploadDate": "number"
                    }
                ]
            },
            errors: [
                { title: 'DB 조회 결과 없음 (9000003)', body: {"code":"9000003","ErrorMessage":"There should be at least one result."}, status: 500 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_complete_attach_delete',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_058',
        fullOnly: true,
        name: '완료 문서 첨부 파일 삭제',
        method: 'DELETE',
        path: '/v2.0/api/document_complete_attachment_delete',
        description: '완료 문서 첨부 파일을 삭제합니다. file_key는 목록 조회의 fileId입니다. 소스상 API Key·멤버 역할 검사가 없습니다(토큰·회사만 확인).',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'document_id', description: '문서 ID (서버 필수 파라미터)', required: true, default: '' },
            { key: 'file_key', description: '삭제할 첨부 파일 키 (목록 조회의 fileId)', required: true, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": "boolean"
            },
            errors: [
                { title: '이미 삭제된 첨부 파일 (4030047)', body: {"code":"4030047","ErrorMessage":"Document attachment has already been deleted."}, status: 400 },
                { title: '삭제된 항목 없음 (9000001)', body: {"code":"9000001","ErrorMessage":"Did not update anything."}, status: 500 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_complete_attach_download',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_059',
        fullOnly: true,
        name: '완료 문서 첨부 파일 다운로드',
        method: 'GET',
        path: '/v2.0/api/document_complete_attachment_download',
        description: '완료 문서 첨부 파일 1개를 내려받습니다. 응답은 파일 바이너리(Content-Disposition 파일명)이므로 [Send and Download]로 보내세요.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [
            { key: 'file_key', description: '첨부 파일 키 (목록 조회의 fileId)', required: true, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                { title: '파일을 찾거나 읽을 수 없음 (4000240)', body: {"code":"4000240","ErrorMessage":"This file does not support."}, status: 500 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_unlock',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_074',
        fullOnly: true,
        name: '문서 쓰기 잠금 해제 (다중 사용자 단계)',
        method: 'POST',
        path: '/v2.0/api/documents/unlock',
        description: '다중 사용자 단계에서 다른 사용자가 작성 중이라 걸린 문서 쓰기 잠금을 해제합니다. 대표 관리자·전체 권한 관리자·현재 단계 담당자만 가능합니다. 입력 오류도 HTTP 500으로 응답합니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            document_id: ''
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string"
            },
            errors: [
                { title: '존재하지 않는 문서 (4000004)', body: {"code":"4000004","ErrorMessage":"The document does not exist."}, status: 500 },
                { title: '잠금 해제 권한 없음 (관리자·현재 단계 담당자 아님) (4030057)', body: {"code":"4030057","ErrorMessage":"You do not have permission."}, status: 500 },
                { title: '다중 사용자 단계 문서가 아님 (4030056)', body: {"code":"4030056","ErrorMessage":"This document is not multi user step."}, status: 500 },
                { title: '유효하지 않은 API Key (4000003)', body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400 },
                { title: '비활성화된 API Key (4030001)', body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_multi_re_request',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_077',
        fullOnly: true,
        name: '여러 문서 재요청',
        method: 'POST',
        path: '/v2.0/api/documents/multi_request_again',
        description: '여러 문서에 수신자 재요청을 한 번에 보냅니다. 문서마다 OPA2_014(수신자 문서 재요청)와 같은 처리를 하며, next_steps를 생략하면 직전 수신자 정보를 그대로 씁니다. 문서별 실패는 HTTP 200의 fail_result로 돌아옵니다. 실제로 알림이 발송됩니다. (선택 키 notification은 소스상 문서 ID 전달 버그가 있어 기본 Body에서 뺐습니다)',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            documents: [
                {
                    document_id: '',
                    next_steps: [
                        {
                            step_type: '',
                            step_seq: '',
                            recipients: [
                                {
                                    member: {
                                        name: '',
                                        id: '',
                                        sms: {
                                            country_code: '',
                                            phone_number: ''
                                        }
                                    },
                                    use_mail: null,
                                    use_sms: null,
                                    auth: {
                                        password: '',
                                        password_hint: '',
                                        valid: {
                                            day: null,
                                            hour: null
                                        }
                                    }
                                }
                            ],
                            comment: ''
                        }
                    ]
                }
            ]
        },
        exampleResponse: {
            success: {
                "success_result": [
                    {
                        "document_id": "string",
                        "status": "string",
                        "code": "string",
                        "message": "string",
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
                    }
                ],
                "fail_result": [
                    {
                        "document_id": "string",
                        "code": "string",
                        "message": "string"
                    }
                ]
            },
            errors: [
                { title: '요청 JSON 처리 실패 (4000001)', body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 400 },
                { title: '유효하지 않은 API Key (4000003)', body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400 },
                { title: '비활성화된 API Key (4030001)', body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_complete_pdf_check',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_078',
        fullOnly: true,
        name: '완료 문서 PDF 생성 여부 확인',
        method: 'GET',
        path: '/v2.0/api/documents/{document_id}/check_complete_pdf_generated',
        description: '완료 문서의 문서 PDF·감사추적 PDF가 생성되었는지 확인합니다. 완료되지 않은 문서는 4000243입니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '확인할 문서 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": {
                    "pdf": "boolean",
                    "auditPdf": "boolean"
                }
            },
            errors: [
                { title: '존재하지 않는 문서 (4000004)', body: {"code":"4000004","ErrorMessage":"The document does not exist."}, status: 400 },
                { title: '삭제된 문서 (4000006)', body: {"code":"4000006","ErrorMessage":"The document has been deleted."}, status: 400 },
                { title: '완료되지 않은 문서 (4000243)', body: {"code":"4000243","ErrorMessage":"This document is not completed."}, status: 400 },
                { title: '문서 파일 정보 없음 (5000001)', body: {"code":"5000001","ErrorMessage":"Internal server error."}, status: 400 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'doc_sign_images',
        group: '문서',
        groupIcon: 'fa-file-lines',
        opaCode: null,
        sourceApiId: 'OPA2_081',
        fullOnly: true,
        name: '문서 서명 이미지 조회',
        method: 'POST',
        path: '/v2.0/api/documents/{document_id}/download_sign_images',
        description: '문서의 서명 컴포넌트 이미지를 조회합니다. GET(쿼리만)과 POST(Body) 모두 받으며, Body의 input 값이 쿼리보다 우선합니다. type을 비우면 서명 원본 데이터를 돌려줍니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'document_id', description: '문서 ID', required: true, default: '' }
        ],
        queryParams: [
            { key: 'type', description: '이미지 형식: png | svg (비우면 원본 데이터)', required: false, default: '' },
            { key: 'width', description: '이미지 가로 크기 (기본 100)', required: false, default: '' },
            { key: 'height', description: '이미지 세로 크기 (기본 100)', required: false, default: '' }
        ],
        defaultBody: {
            input: {
                component_ids: [
                    ''
                ],
                type: '',
                width: null,
                height: null
            }
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": [
                    {
                        "id": "string",
                        "imgData": "string"
                    }
                ]
            },
            errors: [
                { title: '존재하지 않는 문서 (4000004)', body: {"code":"4000004","ErrorMessage":"The document does not exist."}, status: 400 },
                { title: 'API Key 없음 또는 문서 파일 정보 없음 (같은 코드 사용) (4000003)', body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400 },
                { title: '템플릿 없음 (4000046)', body: {"code":"4000046","ErrorMessage":"There is no template."}, status: 400 },
                { title: 'SVG 변환 실패 (5000001)', body: {"code":"5000001","ErrorMessage":"Internal server error."}, status: 500 },
                { title: '비활성화된 API Key (4030001)', body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'template_request_sample',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: null,
        sourceApiId: 'OPA2_099',
        fullOnly: true,
        name: '문서 작성용 샘플 요청 정보 조회',
        method: 'POST',
        path: '/v2.0/api/forms/info',
        description: '템플릿으로 문서를 만들 때 쓸 요청 Body 견본을 돌려줍니다. type이 "api"면 문서 작성(OPA2_005) Body 형태, "embedded"면 임베딩 초기화 옵션 형태입니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            type: '',
            template_id: ''
        },
        exampleResponse: {
            success: {
                "document": {
                    "document_name": "string",
                    "select_group_name": "string",
                    "fields": [
                        {
                            "id": "string",
                            "value": "string"
                        }
                    ],
                    "recipients": [
                        {
                            "step_type": "string",
                            "step_seq": "string",
                            "member": {
                                "name": "string",
                                "id": "string",
                                "sms": {
                                    "country_code": "string",
                                    "phone_number": "string"
                                }
                            },
                            "use_mail": "boolean",
                            "use_sms": "boolean"
                        }
                    ],
                    "comment": "string",
                    "send_external_pdf": {},
                    "notification": []
                }
            },
            errors: [
                { title: 'type 또는 template_id 키 누락 (4000070)', body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}, status: 500 },
                { title: '템플릿 없음 (4000046)', body: {"code":"4000046","ErrorMessage":"There is no template."}, status: 400 },
                { title: 'type이 api·embedded가 아님 (5000211)', body: {"code":"5000211","ErrorMessage":"Invalid type."}, status: 400 },
                { title: '유효하지 않은 API Key (4000003)', body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400 },
                { title: '비활성화된 API Key (4030001)', body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'template_permissions_update',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: null,
        sourceApiId: 'OPA2_062',
        fullOnly: true,
        name: '템플릿 사용·수정 권한 변경',
        method: 'PATCH',
        path: '/v2.0/api/forms/{form_id}/permissions',
        description: '템플릿의 사용(문서 작성) 권한과 수정 권한 대상 멤버·그룹을 추가·삭제합니다. use_all_members·use·modify 중 하나 이상이 필요하고, 각 대상에는 add 또는 delete가 있어야 합니다. 일부만 반영되면 응답에 error가 붙습니다. 대표 관리자·템플릿 소유자·수정 권한자만 가능합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'form_id', description: '템플릿 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            use_all_members: null,
            use: {
                members: {
                    add: [
                        ''
                    ],
                    delete: [
                        ''
                    ]
                },
                groups: {
                    add: [
                        ''
                    ],
                    delete: [
                        ''
                    ]
                }
            },
            modify: {
                members: {
                    add: [
                        ''
                    ],
                    delete: [
                        ''
                    ]
                },
                groups: {
                    add: [
                        ''
                    ],
                    delete: [
                        ''
                    ]
                },
                managers: {
                    add: [
                        ''
                    ],
                    delete: [
                        ''
                    ]
                }
            }
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "template": {
                    "id": "string",
                    "name": "string"
                },
                "error": {
                    "message": "string",
                    "details": [
                        [
                            "string"
                        ]
                    ]
                }
            },
            errors: [
                { title: '템플릿 없음 (4000046)', body: {"code":"4000046","ErrorMessage":"There is no template."}, status: 400 },
                { title: 'use_all_members·use·modify 모두 없음, 또는 add·delete 없음 (4000001)', body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 400 },
                { title: '템플릿 권한 변경 권한 없음 (4000044)', body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}, status: 400 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'template_ozr_parameter',
        group: '템플릿',
        groupIcon: 'fa-file-invoice',
        opaCode: null,
        sourceApiId: 'OPA2_080',
        fullOnly: true,
        name: '템플릿 입력 컴포넌트 정보 조회',
        method: 'POST',
        path: '/v2.0/api/forms/ozr_parameter',
        description: '템플릿 서식(OZR)의 입력 컴포넌트 목록(이름·입력 형식·필수 여부 등)을 조회합니다. form_version을 비우면 배포 버전을 씁니다.',
        requiresAuth: true,
        pathParams: [],
        queryParams: [],
        defaultBody: {
            templates: [
                {
                    form_id: '',
                    form_version: ''
                }
            ]
        },
        exampleResponse: {
            success: {
                "status": "200",
                "code": "-1",
                "message": "string",
                "result": [
                    {
                        "<form_id>": [
                            {
                                "name": "string",
                                "input_type": "string",
                                "accessible": "boolean",
                                "required": "boolean",
                                "used": "boolean",
                                "section": "string",
                                "data_type": "string",
                                "items": [
                                    {
                                        "id": "string",
                                        "value": "string"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            errors: [
                { title: 'templates 누락·빈 목록 (4000001)', body: {"code":"4000001","ErrorMessage":"Required input value not found."}, status: 400 },
                { title: '템플릿 없음 (4000046)', body: {"code":"4000046","ErrorMessage":"There is no template."} },
                { title: '서식 파일(OZR) 없음 (4000045)', body: {"code":"4000045","ErrorMessage":"The OZR file does not exist."} },
                { title: '유효하지 않은 API Key (4000003)', body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}, status: 400 },
                { title: '비활성화된 API Key (4030001)', body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}, status: 403 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
    {
        id: 'account_update',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: null,
        sourceApiId: 'OPA2_032',
        fullOnly: true,
        name: '계정 정보 수정',
        method: 'PATCH',
        path: '/v2.0/api/accounts/{account_id}',
        description: '[주의] 계정(로그인 계정)의 이름·이메일·연락처·비밀번호 등을 수정합니다. 대표 관리자(ADMIN) 토큰만 호출할 수 있습니다. 보낸 키는 빈 값이어도 그대로 저장되어 기존 값이 지워지므로 바꿀 키만 보내세요(marketing: null은 false로 저장). 서버가 대상 계정의 회사 소속을 확인하지 않습니다(SaaS 측 결함) — 다른 회사 계정이 바뀔 수 있으니 자기 회사의 테스트 계정에만 쓰세요. 비밀번호를 바꾸려면 new_password와 현재 비밀번호 password를 함께 보냅니다. 회사 멤버 정보 수정(OPA2_012)과 다른 API입니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'account_id', description: '수정할 계정 ID', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: {
            account: {
                name: ''
            }
        },
        exampleResponse: {
            success: {
                "account": {
                    "id": "string",
                    "name": "string"
                }
            },
            errors: [
                { title: 'account 누락 (4000001)', body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}, status: 400 },
                { title: '존재하지 않는 계정 (4000150)', body: {"code":"4000150","ErrorMessage":"The account does not exist."}, status: 403 },
                { title: '수정할 수 없는 계정 형식 (4000143)', body: {"code":"4000143","ErrorMessage":"Invalid account."}, status: 403 },
                { title: '현재 비밀번호 누락·불일치 (4000139)', body: {"code":"4000139","ErrorMessage":"Invalid id or password."}, status: 400 },
                { title: '비밀번호가 ID·이메일과 같음 (4000256)', body: {"code":"4000256","ErrorMessage":"Password identical to Email or ID is not permitted."}, status: 400 },
                { title: '비밀번호 형식 오류 (4000208)', body: {"code":"4000208","ErrorMessage":"The password format is invalid."}, status: 400 },
                { title: '현재·이전 비밀번호와 같음 (4000223)', body: {"code":"4000223","ErrorMessage":"The new password cannot be the same as the current password."}, status: 400 },
                { title: '접근 권한 없음 (멤버 역할 부족) (4030009)', body: {"code":"4030009","ErrorMessage":"You do not have access."}, status: 403 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 },
                { title: '유효하지 않은 API Key (4000003)', body: { "code": "4000003", "ErrorMessage": "The apiKey does not exist." }, status: 400 },
                { title: '비활성화된 API Key (4030001)', body: { "code": "4030001", "ErrorMessage": "The apiKey is not active." }, status: 403 },
                { title: 'Open API 사용 권한 없음 (4030034)', body: { "code": "4030034", "ErrorMessage": "You don't have Open API permission." }, status: 403 }
            ]
        }
    },
    {
        id: 'account_signature_status',
        group: '멤버',
        groupIcon: 'fa-users',
        opaCode: null,
        sourceApiId: 'OPA2_079',
        fullOnly: true,
        name: '서명 등록 상태 조회',
        method: 'GET',
        path: '/v2.0/api/accounts/{account_id}/signatures',
        description: '계정의 서명·이니셜·도장 등록 여부를 조회합니다. account_id는 토큰을 발급한 member_id(본인)와 같아야 합니다.',
        requiresAuth: true,
        pathParams: [
            { key: 'account_id', description: '조회할 계정 ID (토큰의 member_id와 동일)', required: true, default: '' }
        ],
        queryParams: [],
        defaultBody: null,
        exampleResponse: {
            success: {
                "account_id": "string",
                "signature": "boolean",
                "initial": "boolean",
                "stamp": "boolean"
            },
            errors: [
                { title: 'account_id가 토큰의 member_id와 다름 (4030008)', body: {"code":"4030008","ErrorMessage":"Failed to authenticate the token."}, status: 400 },
                { title: '존재하지 않거나 비활성인 멤버 (4000074)', body: {"code":"4000074","ErrorMessage":"No such member exists."}, status: 400 },
                { title: '유효하지 않거나 만료된 토큰 (4010001)', body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}, status: 401 }
            ]
        }
    },
];
