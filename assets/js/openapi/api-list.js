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
                    body: {"code":"4000001","ErrorMessage":"The body data is invalid."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "execution_time 형식 오류 (long 타입 아님) (40000171)",
                    body: {"code":"40000171","ErrorMessage":"The execution_time is not of a long type."}
                },
                {
                    title: "execution_time 필수 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Execution time(Request time) required."}
                },
                {
                    title: "서명 유효 시간 만료 (4000002)",
                    body: {"code":"4000002","ErrorMessage":"The validation time has expired."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "Base64 디코딩 실패 (API Key 오류) (4030039)",
                    body: {"code":"4030039","ErrorMessage":"The apiKey encoded has an error."}
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
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "유효하지 않은 Refresh Token (4010002)",
                    body: {"code":"4010002","ErrorMessage":"The refresh_token is invalid."}
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
                    title: "Refresh Token 필수 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Refresh token required."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "유효하지 않은 Refresh Token (4010002)",
                    body: {"code":"4010002","ErrorMessage":"The refresh_token is invalid."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
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
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}
                },
                {
                    title: "요청 문서 접근 권한 없음 (4000034)",
                    body: {"code":"4000034","ErrorMessage":"You have no access authority to the requested document."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    title: "문서 접근 권한 없음 (4030029)",
                    body: {"code":"4030029","ErrorMessage":"You do not have access to the document"}
                },
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}
                },
                {
                    title: "문서 또는 감사증명서 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either the document or audit_trail must be selected."}
                },
                {
                    title: "PDF 아직 생성 중 — 잠시 후 재시도 (2020001)",
                    body: {"code":"2020001","ErrorMessage":"The PDF is being generated. Please again try later."}
                },
                {
                    title: "감사 PDF 미생성 — 문서 미완료 (2020001)",
                    body: {"code":"2020001","ErrorMessage":"The audit trail will be generated when the document is completed."}
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
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
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "정형 문서 유형 아님 (4000310)",
                    body: {"code":"4000310","ErrorMessage":"The document is not a structured type."}
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}
                },
                {
                    title: "대면 서명 설정으로 문서 생성 불가 (4000241)",
                    body: {"code":"4000241","ErrorMessage":"No document can be created because the In-person signer option is set in the Start step of this template."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "파일 없음 (4000087)",
                    body: {"code":"4000087","ErrorMessage":"No file exists."}
                },
                {
                    title: "접근 불가 도메인 (URL 문서 작성 미설정) (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}
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
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}
                },
                {
                    title: "참조자(CC) JSON 형식 오류 (4000190)",
                    body: {"code":"4000190","ErrorMessage":"The input value for the CC is in an invalid JSON format."}
                },
                {
                    title: "문서 제목 변경 불가 템플릿 (4000010)",
                    body: {"code":"4000010","ErrorMessage":"This document's title cannot be changed."}
                },
                {
                    title: "파일 IO 오류 (5000038)",
                    body: {"code":"5000038","ErrorMessage":"File IO error."}
                },
                {
                    title: "문서 생성 실패 (5000004)",
                    body: {"code":"5000004","ErrorMessage":"Failed to create the document."}
                },
                {
                    title: "선불 문서 소진 (4000201)",
                    body: {"code":"4000201","ErrorMessage":"You have exhausted all purchased documents"}
                },
                {
                    title: "선불 크레딧 소진 (4000308)",
                    body: {"code":"4000308","ErrorMessage":"You have exhausted all purchased credits."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "다운로드 리소스 없음 (4000065)",
                    body: {"code":"4000065","ErrorMessage":"Failed to get the resource."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
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
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "정형 문서 유형 아님 (4000310)",
                    body: {"code":"4000310","ErrorMessage":"The document is not a structured type."}
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}
                },
                {
                    title: "대면 서명 설정으로 문서 생성 불가 (4000241)",
                    body: {"code":"4000241","ErrorMessage":"No document can be created because the In-person signer option is set in the Start step of this template."}
                },
                {
                    title: "파일 없음 (4000087)",
                    body: {"code":"4000087","ErrorMessage":"No file exists."}
                },
                {
                    title: "접근 불가 도메인 (URL 문서 작성 미설정) (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}
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
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
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
                {
                    title: "유효하지 않은 문서함 유형 (5000089)",
                    body: {"code":"5000089","ErrorMessage":"Invalid document inbox type."}
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "검색 엔진 연결 실패 (5000091)",
                    body: {"code":"5000091","ErrorMessage":"No search engine found."}
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
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
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "템플릿 삭제 권한 없음 (4000164)",
                    body: {"code":"4000164","ErrorMessage":"You have no permission to delete the document."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}
                },
                {
                    title: "대면 서명 단계에는 멤버만 지정 가능 (400242)",
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}
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
                    body: {"code":"400242","ErrorMessage":"You can only select members in a step with in-person signing."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}
                },
                {
                    title: "이메일 또는 SMS 중 하나 선택 필요 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Either one of the Email or SMS options must be selected."}
                },
                {
                    title: "참조자(CC) JSON 형식 오류 (4000190)",
                    body: {"code":"4000190","ErrorMessage":"The input value for the CC is in an invalid JSON format."}
                },
                {
                    title: "문서 제목 변경 불가 템플릿 (4000010)",
                    body: {"code":"4000010","ErrorMessage":"This document's title cannot be changed."}
                },
                {
                    title: "선불 크레딧 소진 (4000308)",
                    body: {"code":"4000308","ErrorMessage":"You have exhausted all purchased credits."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                {
                    title: "존재하지 않는 문서 (4000004)",
                    body: {"code":"4000004","ErrorMessage":"The document does not exist."}
                },
                {
                    title: "활성화된 API Key 멤버 없음 (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The member does not exist."}
                },
                {
                    title: "삭제된 문서 (4000006)",
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}
                },
                {
                    title: "비정형 문서 유형 아님 (4000179)",
                    body: {"code":"4000179","ErrorMessage":"The document is not an unstructured type."}
                },
                {
                    title: "임시 저장 상태 아님 — 다음 단계 처리 불가 (4000180)",
                    body: {"code":"4000180","ErrorMessage":"The document status is not draft."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
            { key: 'company_id', description: '회사 ID', required: true, default: '' }
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
                ]
            }
        },
        exampleResponse: {
            success: {
                "result": {},
                "code": "string",
                "message": "string",
                "status": "string"
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
                    body: {"code":"4000081","ErrorMessage":"Invalid document type."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
            input: {
                executor_id: '',
                executor_name: '',
                comment: ''
            }
        },
        exampleResponse: {
            success: {
                "document_title": "string",
                "document_id": "string"
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
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "템플릿 단계 없음 (4000073)",
                    body: {"code":"4000073","ErrorMessage":"No step settings information exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                "document_title": "string",
                "document_id": "string"
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
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}
                },
                {
                    title: "문서 이력 없음 (4000066)",
                    body: {"code":"4000066","ErrorMessage":"No document history exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
        description: '여러 문서 파일을 한 번에 다운로드합니다.',
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
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "다운로드 횟수 초과 (4000222)",
                    body: {"code":"4000222","ErrorMessage":"Document download limit exceeded."}
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
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
                    body: {"code":"4000006","ErrorMessage":"The document has been deleted."}
                },
                {
                    title: "문서 미완료 — 완료 토큰 갱신 실패 (4000036)",
                    body: {"code":"4000036","ErrorMessage":"This document is not completed."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"5000071","ErrorMessage":"Cannot get information about document progress."}
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"5000076","ErrorMessage":"The non-member request info does not exist."}
                },
                {
                    title: "이미 처리된 문서 (4000029)",
                    body: {"code":"4000029","ErrorMessage":"This document has already proceeded."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "Base64 디코딩 실패 (API Key 오류) (4030039)",
                    body: {"code":"4030039","ErrorMessage":"The apiKey encoded has an error."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}
                },
                {
                    title: "템플릿 없음 (4000046)",
                    body: {"code":"4000046","ErrorMessage":"There is no template."}
                },
                {
                    title: "유효하지 않은 템플릿 요청 상태 (4000264)",
                    body: {"code":"4000264","ErrorMessage":"The form request state is not valid."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
            { key: 'output_type', description: '반환 타입. 1이면 PNG 파일, 미입력 또는 다른 값이면 base64로 반환', required: false, default: '' }
        ],
        defaultBody: null,
        exampleResponse: {
            errors: [
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "멤버 수 초과로 초대 실패 (4000118)",
                    body: {"code":"4000118","ErrorMessage":"Cannot send the invitation as the maximum number of members has been reached."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
                },
                {
                    title: "아이디 또는 비밀번호 오류 (4000139)",
                    body: {"code":"4000139","ErrorMessage":"Invalid id or password."}
                },
                {
                    title: "이미 존재하는 멤버 ID (4000135)",
                    body: {"code":"4000135","ErrorMessage":"This ID is already taken."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "관리자 권한으로 멤버 비활성화 불가 (4000125)",
                    body: {"code":"4000125","ErrorMessage":"Administrator accounts cannot be deactivated."}
                },
                {
                    title: "플랜 제한으로 멤버 활성화 실패 (4000126)",
                    body: {"code":"4000126","ErrorMessage":"Cannot activate the member as the maximum number of members allowed has been reached."}
                },
                {
                    title: "잘못된 이메일 형식 (4000137)",
                    body: {"code":"4000137","ErrorMessage":"This is an invalid email format."}
                },
                {
                    title: "멤버 이메일 변경 실패 (4030041)",
                    body: {"code":"4030041","ErrorMessage":"This email is already in use. Please enter another email."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    title: "삭제된 멤버 (4000149)",
                    body: {"code":"4000149","ErrorMessage":"No such member exists."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    title: "회사 ID와 토큰 불일치 (4030027)",
                    body: {"code":"4030027","ErrorMessage":"The company does not have access."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 계정 (4000150)",
                    body: {"code":"4000150","ErrorMessage":"The account does not exist."}
                },
                {
                    title: "DB 연결 실패 (5000002)",
                    body: {"code":"5000002","ErrorMessage":"Failed to connect to CouchDB."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "이미 존재하는 그룹 이름 (4000122)",
                    body: {"code":"4000122","ErrorMessage":"The group name is already in use."}
                },
                {
                    title: "그룹 이름 비워둘 수 없음 (4000249)",
                    body: {"code":"4000249","ErrorMessage":"The group name is cannot be empty"}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 그룹 (4000123)",
                    body: {"code":"4000123","ErrorMessage":"The group does not exist."}
                },
                {
                    title: "이미 존재하는 그룹 이름 (4000122)",
                    body: {"code":"4000122","ErrorMessage":"The group name is already in use."}
                },
                {
                    title: "그룹 이름 비워둘 수 없음 (4000249)",
                    body: {"code":"4000249","ErrorMessage":"The group name is cannot be empty"}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 그룹 (4000011)",
                    body: {"code":"4000011","ErrorMessage":"The group does not exist."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "이미 존재하는 회사 도장 이름 (4000174)",
                    body: {"code":"4000174","ErrorMessage":"This name has already been used for another stamp."}
                },
                {
                    title: "회사 도장 최대 업로드 크기 초과 (4130002)",
                    body: {"code":"4130002","ErrorMessage":"The file has exceeded the maximum size."}
                },
                {
                    title: "유효하지 않은 회사 도장 이미지 (4000231)",
                    body: {"code":"4000231","ErrorMessage":"Invalid company stamp image data."}
                },
                {
                    title: "도장 데이터 생성 실패 (4000229)",
                    body: {"code":"4000229","ErrorMessage":"Failed to create online data in the stamp."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                {
                    title: "잘못된 JSON 형식 (4000070)",
                    body: {"code":"4000070","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "필수 입력값 누락 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Required input value not found."}
                },
                {
                    title: "존재하지 않는 회사 도장 (4000175)",
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "잘못된 JSON 형식 (4000001)",
                    body: {"code":"4000001","ErrorMessage":"Invalid input JSON format."}
                },
                {
                    title: "이미 존재하는 회사 도장 이름 (4000174)",
                    body: {"code":"4000174","ErrorMessage":"This name has already been used for another stamp."}
                },
                {
                    title: "회사 도장 최대 업로드 크기 초과 (4130002)",
                    body: {"code":"4130002","ErrorMessage":"The file has exceeded the maximum size."}
                },
                {
                    title: "유효하지 않은 회사 도장 이미지 (4000231)",
                    body: {"code":"4000231","ErrorMessage":"Invalid company stamp image data."}
                },
                {
                    title: "도장 데이터 생성 실패 (4000229)",
                    body: {"code":"4000229","ErrorMessage":"Failed to create online data in the stamp."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000175","ErrorMessage":"No stamp found."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "접근 불가 도메인 (URL 문서 작성 미설정) (4000115)",
                    body: {"code":"4000115","ErrorMessage":"This domain cannot be accessed."}
                },
                {
                    title: "잘못된 날짜 형식 (4000013)",
                    body: {"code":"4000013","ErrorMessage":"The date format is invalid."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
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
            skip: '',
            limit: '',
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                { type: '', id: '' }
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                { type: '', id: '' }
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
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
                "enabled": "boolean",
                "form_modify_auth": "boolean",
                "title_change": "boolean",
                "quick_processing": "boolean",
                "form_doc_retention_period": {
                    "usePeriod": "boolean",
                    "periodType": "string",
                    "period": "number"
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
                    body: {"code":"4000044","ErrorMessage":"You have no permission to access the form."}
                },
                {
                    title: "비활성화된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"Cannot create a document because the template has been deactivated."}
                },
                {
                    title: "만료된 템플릿 (4000008)",
                    body: {"code":"4000008","ErrorMessage":"The template has expired."}
                },
                {
                    title: "유효하지 않은 API Key (4000003)",
                    body: {"code":"4000003","ErrorMessage":"The apiKey does not exist."}
                },
                {
                    title: "지원하지 않는 API Key 유형 (4030005)",
                    body: {"code":"4030005","ErrorMessage":"This API is not supported."}
                },
                {
                    title: "비활성화된 API Key (4030001)",
                    body: {"code":"4030001","ErrorMessage":"The apiKey is not active."}
                },
                {
                    title: "존재하지 않는 회사 (4000005)",
                    body: {"code":"4000005","ErrorMessage":"Invalid company."}
                },
                {
                    title: "Open API 사용 권한 없음 (4030034)",
                    body: {"code":"4030034","ErrorMessage":"You don't have Open API permission."}
                },
                {
                    title: "존재하지 않는 멤버 (4000074)",
                    body: {"code":"4000074","ErrorMessage":"No such member exists."}
                },
                {
                    title: "존재하지 않는 멤버 (4000097)",
                    body: {"code":"4000097","ErrorMessage":"No such member exists."}
                },
                {
                    title: "국가 정보 조회 실패 (4000038)",
                    body: {"code":"4000038","ErrorMessage":"Failed to get the country list."}
                },
                {
                    title: "접근 권한이 없음 (4030009)",
                    body: {"code":"4030009","ErrorMessage":"You do not have access."}
                },
                {
                    title: "삭제된 회사 (4000076)",
                    body: {"code":"4000076","ErrorMessage":"The company has already been deleted."}
                },
                {
                    title: "Access Token 클레임 오류 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"The access_token claim is invalid."}
                },
                {
                    title: "유효하지 않거나 만료된 토큰 (4010001)",
                    body: {"code":"4010001","ErrorMessage":"Invalid or expired token."}
                },
                {
                    title: "유효하지 않은 토큰 정보 (4010007)",
                    body: {"code":"4010007","ErrorMessage":"Invalid token information."}
                },
                {
                    title: "Access Token 만료 (4010004)",
                    body: {"code":"4010004","ErrorMessage":"The token has expired."}
                },
                {
                    title: "Refresh Token 만료 (4010006)",
                    body: {"code":"4010006","ErrorMessage":"The refresh token has expired."}
                },
                {
                    title: "이용 정지된 회사 (4030052)",
                    body: {"code":"4030052","ErrorMessage":"The company has been suspended."}
                },
                {
                    title: "개인 플랜은 Open API 미지원 (4030025)",
                    body: {"code":"4030025","ErrorMessage":"It is not available in the personal plan."}
                },
                {
                    title: "연체로 인해 Open API 사용 불가 (4030026)",
                    body: {"code":"4030026","ErrorMessage":"Cannot be used due to overdue charges."}
                },
                {
                    title: "내부 서버 오류 (5000001)",
                    body: {"code":"5000001","ErrorMessage":"Internal server error."}
                }
            ]
        }
    },
];
