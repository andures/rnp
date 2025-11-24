# 🔍 Guía de Verificación - Integración RNP

## ✅ Cambios Implementados

### 1. Archivo `.env` Corregido

- ✅ Agregadas variables `RNP_BASE_URL_TEST` y `RNP_BASE_URL_PROD`
- ✅ Eliminada duplicación de credenciales
- ✅ Credenciales de PRODUCCIÓN (1N4M3N0R) como default en .env
- ✅ Documentación clara sobre cómo usar credenciales de PRUEBAS

### 2. Lógica de Selección de Ambiente (Backend)

El backend selecciona automáticamente el ambiente correcto:

#### Reglas de Selección:

1. **Si envías `environment: "test"`** → Usa `https://wstest.rnp.hn:1893`
2. **Si envías `environment: "prod"`** → Usa `https://soapservices.rnp.hn`
3. **Si NO envías environment pero usas credenciales PRUEBAS** → Automáticamente usa TEST
4. **Si NO envías environment y usas otras credenciales** → Usa PROD por defecto

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Certificado con Credenciales de PRUEBAS (Ambiente TEST)

**Endpoint:** `POST /api/rnp/certificado-nacimiento`

**Body:**

```json
{
  "numeroIdentidad": "0801197206013",
  "codigoInstitucion": "PRUEBAS",
  "codigoSeguridad": "T3$T1NG",
  "usuarioInstitucion": "Usuario13"
}
```

**Resultado Esperado:**

- ✅ Debe ir a: `https://wstest.rnp.hn:1893`
- ✅ Debe mostrar en logs: `env=test`
- ✅ Debe retornar certificado PDF en base64

---

### Prueba 2: Información Completa con Credenciales REALES (Ambiente PROD)

**Endpoint:** `POST /api/rnp/inf-completa-inscripcion`

**Body:**

```json
{
  "numeroIdentidad": "0801199723598",
  "codigoInstitucion": "1N4M3N0R",
  "codigoSeguridad": "016620BE9E5545D4A58927CD11ABFA82",
  "usuarioInstitucion": "1605199500127"
}
```

**Resultado Esperado:**

- ✅ Debe ir a: `https://soapservices.rnp.hn`
- ✅ Debe mostrar en logs: `env=prod`
- ✅ Debe retornar datos del inscrito, madre y padre

---

### Prueba 3: Info Complementaria con Credenciales REALES (esperando CSI)

**Endpoint:** `POST /api/rnp/inf-complementaria-inscripcion`

**Body:**

```json
{
  "numeroIdentidad": "0801199723598",
  "codigoInstitucion": "1N4M3N0R",
  "codigoSeguridad": "016620BE9E5545D4A58927CD11ABFA82",
  "usuarioInstitucion": "1605199500127",
  "preferReal": true
}
```

**Resultado Esperado:**

- ✅ Debe ir a: `https://soapservices.rnp.hn`
- ✅ Debe mostrar en logs: `env=prod`
- ⚠️ **Probablemente retorne 401 con error CSI** (falta autorización para esta operación específica)

---

### Prueba 4: Forzar Ambiente TEST con Credenciales Reales (para debugging)

**Endpoint:** `POST /api/rnp/certificado-nacimiento`

**Body:**

```json
{
  "numeroIdentidad": "0801197206013",
  "codigoInstitucion": "1N4M3N0R",
  "codigoSeguridad": "016620BE9E5545D4A58927CD11ABFA82",
  "usuarioInstitucion": "1605199500127",
  "environment": "test"
}
```

**Resultado Esperado:**

- ✅ Debe ir a: `https://wstest.rnp.hn:1893` (forzado)
- ✅ Debe mostrar en logs: `env=test`
- ⚠️ Probablemente retorne error (credenciales reales en servidor de pruebas)

---

## 📊 Todas las Operaciones Verificadas

| Operación                 | Frontend | Backend Action                     | WSDL Prod | Estado    |
| ------------------------- | -------- | ---------------------------------- | --------- | --------- |
| Certificado Nacimiento    | ✅       | `qry_CertificadoNacimiento`        | ✅        | **MATCH** |
| Árbol Genealógico         | ✅       | `lst_ArbolGenealogico`             | ✅        | **MATCH** |
| Info Completa Inscripción | ✅       | `Qry_InfCompletaInscripcion`       | ✅        | **MATCH** |
| Info Complementaria       | ✅       | `Qry_InfComplementariaInscripcion` | ✅        | **MATCH** |
| Inscripción Nacimiento    | ✅       | `Qry_InscripcionNacimiento`        | ✅        | **MATCH** |

---

## 🔍 Qué Revisar en los Logs

### Logs Exitosos (ejemplo):

```
🔍 Solicitud de certificado de nacimiento para: 0801197206013
📋 Credenciales recibidas: institucion=PRUEBAS, usuario=Usuario13, seguridad=T3*T1NG
🔧 Estado de acceso RNP:
   - Código Institución: PRUEBAS
   - Usuario: Usuario13
   - Credenciales oficiales de prueba: ✅ SÍ
   - Estado: ✅ PROBANDO CREDENCIALES CONTRA RNP REAL
📡 Base URL RNP usada: https://wstest.rnp.hn:1893 (env=test)
✅ Servicio RNP creado exitosamente
🔄 Realizando consulta RNP... (Credenciales oficiales de prueba)
📋 Solicitando certificado de nacimiento para: 0801197206013
🛰️ SOAP call => action=qry_CertificadoNacimiento, baseUrl=https://wstest.rnp.hn:1893, path=/API/WSinscripciones.asmx
🔐 Credenciales usadas => institucion=PRUEBAS, usuario=Usuario13, seguridad=T3*T1NG
📡 Respuesta XML recibida
✅ Certificado de nacimiento obtenido exitosamente
✅ Certificado obtenido exitosamente para: 0801197206013
```

### Logs con Error CSI (esperado para inf-complementaria):

```
📋 Solicitud de información complementaria de inscripción para: 0801199723598
📋 Credenciales recibidas: institucion=1N4M3N0R, usuario=1605199500127, seguridad=016620BE9E5545D4A58927CD11A*FA82
📡 Base URL RNP usada: https://soapservices.rnp.hn (env=prod)
✅ Servicio RNP creado exitosamente
🔄 Realizando consulta RNP...
🛰️ SOAP call => action=Qry_InfComplementariaInscripcion, baseUrl=https://soapservices.rnp.hn, path=/API/WSinscripciones.asmx
📡 Respuesta XML recibida
❌ Error obteniendo información complementaria para 0801199723598: CSI
```

---

## ⚠️ Problemas Conocidos y Soluciones

### Problema 1: Certificado con PRUEBAS no funciona

**Síntomas:** Error o respuesta vacía con credenciales PRUEBAS  
**Causa probable:** El backend está usando PROD en lugar de TEST  
**Solución:**

- Verifica en logs que diga `env=test` y `baseUrl=https://wstest.rnp.hn:1893`
- Si no, asegúrate de enviar las credenciales EXACTAS: `PRUEBAS / T3$T1NG / Usuario13`

### Problema 2: CSI en Info Complementaria (PROD)

**Síntomas:** Error CSI con credenciales reales en `/inf-complementaria-inscripcion`  
**Causa:** Falta habilitación de esa operación específica para tu institución  
**Solución:** Contactar a RNP para habilitar `Qry_InfComplementariaInscripcion` para:

- Institución: 1N4M3N0R
- Usuario: 1605199500127
- Operación específica que incluye foto/residencia

### Problema 3: Info Completa funciona pero Complementaria no

**Explicación:** Son operaciones diferentes con permisos independientes:

- `Qry_InfCompletaInscripcion` - Datos básicos del inscrito y padres
- `Qry_InfComplementariaInscripcion` - Incluye residencia, contactos, foto (requiere permisos extra)

---

## ✅ Checklist de Verificación

- [ ] `.env` tiene `RNP_BASE_URL_TEST` y `RNP_BASE_URL_PROD` definidos
- [ ] Credenciales de PRODUCCIÓN están como default en `.env`
- [ ] Prueba con PRUEBAS muestra `env=test` en logs
- [ ] Prueba con credenciales reales muestra `env=prod` en logs
- [ ] `Qry_InfCompletaInscripcion` funciona en PROD
- [ ] Si CSI en `Qry_InfComplementariaInscripcion`, está documentado para solicitar habilitación

---

## 📞 Siguiente Paso si persiste CSI

Si `Qry_InfComplementariaInscripcion` sigue dando CSI en PROD:

**Solicitud a RNP:**

```
Asunto: Habilitación de operación Qry_InfComplementariaInscripcion

Solicito habilitar la operación Qry_InfComplementariaInscripcion en producción para:

- Entorno: PRODUCCIÓN
- URL: https://soapservices.rnp.hn/API/WSinscripciones.asmx
- Operación: Qry_InfComplementariaInscripcion
- Institución: 1N4M3N0R
- Usuario: 1605199500127
- IP de origen: [TU_IP_PUBLICA]

La operación Qry_InfCompletaInscripcion funciona correctamente con las mismas credenciales.

Error recibido: CSI (Credenciales no autorizadas para esta operación)
Fecha/hora de prueba: [TIMESTAMP]
Número de identidad de prueba: 0801199723598
```
