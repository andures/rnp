# RNP meeting brief — Production error summary

Date: 2025-11-11

## What we call and where it goes

- Environment: PRODUCCIÓN
- Base URL: https://soapservices.rnp.hn
- Service path: /API/WSinscripciones.asmx
- Primary SOAPAction: https://servicios.rnp.hn/qry_CertificadoNacimiento
- We also use: lst_ArbolGenealogico, Qry_InfCompletaInscripcion, Qry_InscripcionNacimiento, Qry_InfComplementariaInscripcion

## Credentials used (as provided)

- codigoInstitucion: 1N4M3N0R
- usuarioInstitucion: 1605199500127
- codigoSeguridad: 0166•••••••••••••••••••••••••••FA82 (masked)

These are configured in our .env and used by default in PROD if no explicit credentials are passed in the request body.

## What happens now (evidence)

- Frontend call to our backend endpoint

  - POST http://localhost:3001/api/rnp/certificado-nacimiento
  - Body example (JSON):
    {
    "numeroIdentidad": "0801201316090",
    "codigoInstitucion": "1N4M3N0R",
    "codigoSeguridad": "•••",
    "usuarioInstitucion": "1605199500127",
    "preferReal": true,
    "environment": "prod"
    }

- Backend forwards to RNP SOAP endpoint (PROD), with correct path and SOAPAction per WSDL.

- Observed result (from our logs and the frontend error payload):

  - HTTP 400 (we surface business errors as 4xx to the frontend)
  - Body:
    {
    "success": false,
    "error": "ERR",
    "message": "No se encontró institución",
    "consulta": "qry_CertificadoNacimiento",
    "parametrosUsados": { "numeroIdentidad": "0801201316090" },
    "timestamp": "2025-11-11T15:00:03.128Z"
    }

- Earlier in PROD, "Qry_InfComplementariaInscripcion" responded with "CSI" (indicando sin información/permiso), which is consistent with a permission/configuration issue rather than integration errors.

- In TEST environment, using official PRUEBAS credentials against https://wstest.rnp.hn:1893, the same code path works, which isolates the issue to PROD credential/configuration.

## Why we believe this is a credentials/configuration issue in RNP PROD

- Our integration details are correct and verified:
  - Correct PROD host and service path: /API/WSinscripciones.asmx (not /APII)
  - Correct SOAPAction namespace: https://servicios.rnp.hn
  - Envelope parameters: numeroIdentidad, codigoInstitucion, codigoSeguridad, usuarioInstitucion
  - No parsing/transport errors; we receive a valid SOAP response, but with a business-level error field that maps to "No se encontró institución".
- The error message comes from RNP (DetalleError.TipoDeError="ERR", DescripcionError="No se encontró institución").
- Therefore, the institution code and/or its linkage to the provided user/security code is not recognized/active in PROD.

## Specific asks for RNP team

Please verify in PRODUCCIÓN:

1. Institution record

   - That codigoInstitucion = 1N4M3N0R exists and is active.
   - Confirm it is a real, intended production code (not a placeholder/test code).

2. User linkage and status

   - That usuarioInstitucion = 1605199500127 is correctly linked to the institution 1N4M3N0R.
   - User is active and not locked.

3. Security code

   - That codigoSeguridad = 0166…FA82 is correct for the above institution/user and has not been rotated or expired.

4. Service permissions

   - That the institution/user has authorization for the methods we’re calling, especially qry_CertificadoNacimiento.
   - For Qry_InfComplementariaInscripcion, please enable the necessary permission so it stops returning CSI in PROD.

5. Network access

   - Confirm our server’s public IP is whitelisted (if applicable in PROD). We can share the exact IP upon request.

6. Endpoint/Action allow-list
   - Confirm that the SOAPAction and service path listed above are correct for PROD and that our requests are reaching the intended service instance.

## Minimal SOAP envelope (masked)

Note: Values masked. Structure shown for clarity;

<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<qry_CertificadoNacimiento xmlns="https://servicios.rnp.hn/">
<numeroIdentidad>0801201316090</numeroIdentidad>
<codigoInstitucion>1N4M3N0R</codigoInstitucion>
<codigoSeguridad>0166•••••••••••••••••••••••••••FA82</codigoSeguridad>
<usuarioInstitucion>1605199500127</usuarioInstitucion>
</qry_CertificadoNacimiento>
</soap:Body>
</soap:Envelope>

## How to reproduce (options)

A) Via our backend REST route (preferred for auditability)

- POST http://localhost:3001/api/rnp/certificado-nacimiento
- JSON body as above (environment: "prod", preferReal: true)

B) Direct SOAP (if needed by RNP)

- POST to https://soapservices.rnp.hn/API/WSinscripciones.asmx
- Header: SOAPAction: "https://servicios.rnp.hn/qry_CertificadoNacimiento"
- Body: envelope above

## Conclusions so far

- Code and integration layer are behaving as expected in PROD: correct URL/action; valid SOAP exchange.
- Error is produced by RNP business layer indicating the institution is not found for the provided credentials in PROD.
- Remediation requires RNP to validate and (if needed) provision/activate the institution, user linkage, security code, and method permissions.

## Appendix — TEST baseline

- TEST host: https://wstest.rnp.hn:1893
- Using official PRUEBAS credentials per RNP manual, the same flows run successfully in TEST.

— End of brief —
