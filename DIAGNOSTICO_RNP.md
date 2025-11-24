# 🔍 GUÍA DE DIAGNÓSTICO DETALLADO - RNP API

## ✅ Logs Ultra-Detallados Implementados

Se han agregado logs exhaustivos en todo el flujo de comunicación SOAP para diagnosticar exactamente qué está pasando.

---

## 📊 Estructura de los Logs

### 1. Inicio de Llamada SOAP

```
================================================================================
🚀 INICIANDO LLAMADA SOAP AL RNP
================================================================================
📍 URL Completa: https://soapservices.rnp.hn/API/WSinscripciones.asmx
🎯 SOAPAction: "https://servicios.rnp.hn/qry_CertificadoNacimiento"
🔐 Credenciales:
   - Institución: 1N4M3N0R
   - Usuario: 1605199500127
   - Seguridad: 016620BE9E5545D4A58927CD11A*FA82
```

### 2. SOAP Envelope Enviado

```
📤 SOAP ENVELOPE ENVIADO:
--------------------------------------------------------------------------------
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <qry_CertificadoNacimiento xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>0801200807174</NumeroIdentidad>
      <CodigoInstitucion>1N4M3N0R</CodigoInstitucion>
      <CodigoSeguridad>016620BE9E5545D4A58927CD11A*FA82</CodigoSeguridad>
      <UsuarioInstitucion>1605199500127</UsuarioInstitucion>
    </qry_CertificadoNacimiento>
  </soap:Body>
</soap:Envelope>
--------------------------------------------------------------------------------
```

### 3. Respuesta del Servidor

```
✅ RESPUESTA RECIBIDA (1234ms)
📊 Status: 200 OK
📦 Content-Type: text/xml; charset=utf-8
📏 Content-Length: 5678

📥 SOAP RESPONSE XML:
--------------------------------------------------------------------------------
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope>
  <soap:Body>
    <qry_CertificadoNacimientoResponse>
      <qry_CertificadoNacimientoResult>
        ...
      </qry_CertificadoNacimientoResult>
    </qry_CertificadoNacimientoResponse>
  </soap:Body>
</soap:Envelope>
--------------------------------------------------------------------------------
```

### 4. Parseo del XML

```
🔍 PARSEANDO RESPUESTA XML
--------------------------------------------------------------------------------
✅ XML parseado exitosamente
📋 Estructura del Body:
{
  "qry_CertificadoNacimientoResponse": {
    "qry_CertificadoNacimientoResult": {
      "NumeroIdentidad": "0801200807174",
      "Certificado": "JVBERi0xLjQK...",
      "GUID": "abc-123-def",
      "DetalleError": null
    }
  }
}
--------------------------------------------------------------------------------
```

### 5. Análisis del Resultado

```
🔎 ANALIZANDO RESULTADO PARSEADO
--------------------------------------------------------------------------------
📋 Result completo: {
  "NumeroIdentidad": "0801200807174",
  "Certificado": "JVBERi0xLjQK...",
  "GUID": "abc-123-def"
}
--------------------------------------------------------------------------------

✅ CERTIFICADO ENCONTRADO
   - NumeroIdentidad: 0801200807174
   - GUID: abc-123-def
   - Certificado length: 12345 bytes
```

---

## 🚨 Escenarios de Error y Qué Significan

### Error 1: HTTP 404

```
❌ ERROR EN LLAMADA SOAP
================================================================================
📊 HTTP Status: 404 Not Found
📍 URL: https://soapservices.rnp.hn/API/WSinscripciones.asmx
```

**Significado:** La URL del endpoint está mal o no existe  
**Solución:** Verificar que la URL sea exactamente: `https://soapservices.rnp.hn/API/WSinscripciones.asmx`

---

### Error 2: HTTP 500 (Error del Servidor)

```
❌ ERROR EN LLAMADA SOAP
================================================================================
📊 HTTP Status: 500 Internal Server Error
📥 Response Data:
<soap:Fault>
  <faultcode>soap:Server</faultcode>
  <faultstring>Error en el servidor</faultstring>
</soap:Fault>
```

**Significado:** El servidor RNP tuvo un error interno procesando tu request  
**Posibles causas:**

- Parámetros inválidos
- Error en la base de datos del RNP
- Servicio temporalmente caído

---

### Error 3: CSI (Credenciales no Autorizadas)

```
🔎 ANALIZANDO RESULTADO PARSEADO
--------------------------------------------------------------------------------
⚠️ DETALLE DE ERROR EN RESPUESTA RNP:
   - Tipo: CSI
   - Descripción: Credenciales no válidas o no autorizadas
```

**Significado:** El RNP rechazó tus credenciales  
**Posibles causas:**

- Credenciales incorrectas
- Usuario/institución no habilitados para esta operación
- IP no está en la whitelist del RNP
- Operación específica no autorizada para tu institución

---

### Error 4: Respuesta Vacía/Inválida

```
❌ RESULTADO VACÍO O INVÁLIDO
📋 parsedResponse completo: {
  "qry_CertificadoNacimientoResponse": {}
}
```

**Significado:** El RNP respondió pero sin datos  
**Posibles causas:**

- Número de identidad no existe en la base de datos
- Formato de respuesta inesperado
- Error en el parseo del XML

---

### Error 5: No se Recibió Certificado

```
❌ NO SE RECIBIÓ CERTIFICADO EN LA RESPUESTA
📋 Campos presentes en result: ["NumeroIdentidad", "GUID"]
```

**Significado:** La respuesta llegó pero sin el campo Certificado  
**Posibles causas:**

- La persona no tiene certificado disponible
- Error en la generación del PDF en el lado del RNP
- Permisos insuficientes para obtener el certificado

---

### Error 6: Timeout

```
❌ ERROR EN LLAMADA SOAP
================================================================================
⚠️ No se recibió respuesta del servidor RNP
📍 URL intentada: https://soapservices.rnp.hn/API/WSinscripciones.asmx
⏱️ Timeout configurado: 30000ms
📋 Error code: ECONNABORTED
```

**Significado:** El servidor no respondió en 30 segundos  
**Posibles causas:**

- Servidor RNP sobrecargado
- Problemas de red
- Firewall bloqueando la conexión

---

### Error 7: No se Puede Conectar

```
❌ ERROR EN LLAMADA SOAP
================================================================================
⚠️ No se recibió respuesta del servidor RNP
📋 Error code: ECONNREFUSED
```

**Significado:** No se pudo establecer conexión  
**Posibles causas:**

- URL incorrecta
- Servicio RNP caído
- Firewall bloqueando
- DNS no resuelve

---

## 🔍 Cómo Diagnosticar Tu Problema

### Paso 1: Identifica en qué etapa falla

Busca en los logs el último mensaje exitoso:

1. **Si llega hasta "📤 SOAP ENVELOPE ENVIADO"** pero no hay "✅ RESPUESTA RECIBIDA"
   → Problema de red o el servidor RNP no responde

2. **Si llega a "✅ RESPUESTA RECIBIDA"** pero falla en "🔍 PARSEANDO"
   → El XML de respuesta tiene formato inesperado

3. **Si llega a "✅ XML parseado"** pero falla en "🔎 ANALIZANDO RESULTADO"
   → La estructura de la respuesta no es la esperada

4. **Si llega a "⚠️ DETALLE DE ERROR EN RESPUESTA RNP"**
   → El RNP respondió correctamente pero con un error de negocio (ej: CSI)

5. **Si llega a "❌ NO SE RECIBIÓ CERTIFICADO"**
   → La respuesta llegó pero sin el dato principal

---

## 📋 Checklist de Diagnóstico

Cuando veas un error, revisa en orden:

- [ ] **URL Completa**: ¿Es exactamente `https://soapservices.rnp.hn/API/WSinscripciones.asmx`?
- [ ] **SOAPAction**: ¿Es `"https://servicios.rnp.hn/qry_CertificadoNacimiento"`?
- [ ] **Credenciales**: ¿Son las correctas? ¿Están bien escritas?
- [ ] **NumeroIdentidad**: ¿Tiene exactamente 13 dígitos?
- [ ] **HTTP Status**: ¿Es 200 OK?
- [ ] **Content-Type**: ¿Es `text/xml`?
- [ ] **Response XML**: ¿Tiene estructura válida de SOAP?
- [ ] **DetalleError**: ¿Hay algún error reportado por el RNP?

---

## 🎯 Próximo Paso

**EJECUTA LA PRUEBA AHORA** con tus credenciales reales:

```json
POST /api/rnp/certificado-nacimiento
{
  "numeroIdentidad": "0801200807174",
  "codigoInstitucion": "1NAM3N0R",
  "codigoSeguridad": "016620BE9E5545D4A58927CD11ABFA82",
  "usuarioInstitucion": "1605199500127"
}
```

**Luego revisa la consola del backend** y:

1. Copia TODO el bloque desde "🚀 INICIANDO LLAMADA SOAP" hasta el final
2. Identifica en qué punto exacto falla
3. Busca el escenario correspondiente arriba
4. Aplica la solución sugerida

---

## 💡 Tips para Compartir Logs

Si necesitas ayuda, comparte:

- ✅ El bloque completo desde "🚀 INICIANDO" hasta el error
- ✅ El "📥 SOAP RESPONSE XML" completo (o al menos los primeros 2000 caracteres)
- ✅ El "📋 Result completo" si existe
- ❌ NO compartas credenciales completas (los logs ya las enmascaran)
