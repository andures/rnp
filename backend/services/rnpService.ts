import axios from "axios";
const xml2js = require("xml2js");

// Configuración para la API del RNP
export interface RNPConfig {
  baseUrl: string;
  codigoInstitucion: string;
  codigoSeguridad: string;
  usuarioInstitucion: string;
}

// Tipos para las respuestas
export interface CertificadoNacimientoRequest {
  numeroIdentidad: string;
}

export interface CertificadoNacimientoResponse {
  numeroIdentidad: string;
  certificado: string; // base64Binary
  guid: string;
  detalleError?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

export interface ArbolGenealogicoRequest {
  numeroIdentidad: string;
}

export interface PersonaArbol {
  orden: string;
  numeroIdentidad: string;
  nombreCompleto: string;
  parentesco: string;
}

export interface ArbolGenealogicoResponse {
  numeroIdentidad: string;
  arbolGenealogico: PersonaArbol[];
  detalleError?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

export interface InfCompletaInscripcionRequest {
  numeroIdentidad: string;
}

export interface PersonaCompleta {
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  estadoVivencia: number;
  fechaDeDefuncion: string;
  errorMsg?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

export interface InfCompletaInscripcionResponse {
  numeroIdentidad: string;
  inscripcion: PersonaCompleta;
  madre: PersonaCompleta;
  padre: PersonaCompleta;
  detalleError?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

export interface InscripcionNacimientoRequest {
  numeroIdentidad: string;
}

export interface InscripcionNacimientoResponse {
  numeroIdentidad: string;
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  estadoVivencia: number;
  fechaDeDefuncion: string;
  errorMsg?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

// Complementaria: información ampliada (incluye residencia, contactos y foto)
export interface InfComplementariaInscripcionRequest {
  numeroIdentidad: string;
}

export interface ErrorDetalle {
  tipoDeError: string;
  descripcionError: string;
}

export interface PersonaBasica {
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  estadoVivencia: number;
  fechaDeDefuncion: string;
  errorMsg?: ErrorDetalle;
}

export interface InfComplementariaInscripcionResponse {
  numeroIdentidad: string;
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  descrEstadoCivil: string;
  estadoVivencia: number;
  descrEstadoVivencia: string;
  fechaDeDefuncion: string;
  paisNacimiento?: number;
  descrPaisNacimiento?: string;
  deptoNacimiento?: number;
  descrDeptoNacimiento?: string;
  municNacimiento?: number;
  descrMunicNacimiento?: string;
  barrioNacimiento?: number;
  descrBarrioNacimiento?: string;
  paisResidencia: number;
  descrPaisResidencia: string;
  deptoResidencia: number;
  descrDeptoResidencia: string;
  municResidencia: number;
  descrMunicResidencia: string;
  barrioResidencia: number;
  descrBarrioResidencia: string;
  direccionResidencia: string;
  ocupacionLaboral: number;
  descrOcupacionLaboral: string;
  numeroTelefono: string;
  telefonoCelular: string;
  correoElectronico: string;
  madre?: PersonaBasica;
  padre?: PersonaBasica;
  errorMsg?: ErrorDetalle;
  foto?: string; // base64Binary
  fotoError?: ErrorDetalle;
}

export interface RNPApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class RNPService {
  private config: RNPConfig;

  constructor(config: RNPConfig) {
    this.config = config;
  }

  /**
   * Enmascara secretos dejando visibles los últimos 4 caracteres
   */
  private maskSecret(value?: string): string {
    if (!value) return "";
    try {
      return String(value).replace(/.(?=.{4}$)/g, "*");
    } catch {
      return "***";
    }
  }

  /**
   * Construye el envelope SOAP para la solicitud
   */
  private buildSoapEnvelope(action: string, body: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Construye el cuerpo SOAP para certificado de nacimiento
   */
  private buildCertificadoNacimientoBody(numeroIdentidad: string): string {
    return `<qry_CertificadoNacimiento xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>${numeroIdentidad}</NumeroIdentidad>
      <CodigoInstitucion>${this.config.codigoInstitucion}</CodigoInstitucion>
      <CodigoSeguridad>${this.config.codigoSeguridad}</CodigoSeguridad>
      <UsuarioInstitucion>${this.config.usuarioInstitucion}</UsuarioInstitucion>
    </qry_CertificadoNacimiento>`;
  }

  /**
   * Construye el cuerpo SOAP para árbol genealógico
   */
  private buildArbolGenealogicoBody(numeroIdentidad: string): string {
    return `<lst_ArbolGenealogico xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>${numeroIdentidad}</NumeroIdentidad>
      <CodigoInstitucion>${this.config.codigoInstitucion}</CodigoInstitucion>
      <CodigoSeguridad>${this.config.codigoSeguridad}</CodigoSeguridad>
      <UsuarioInstitucion>${this.config.usuarioInstitucion}</UsuarioInstitucion>
    </lst_ArbolGenealogico>`;
  }

  /**
   * Construye el cuerpo SOAP para información completa de inscripción
   */
  private buildInfCompletaInscripcionBody(numeroIdentidad: string): string {
    return `<Qry_InfCompletaInscripcion xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>${numeroIdentidad}</NumeroIdentidad>
      <CodigoInstitucion>${this.config.codigoInstitucion}</CodigoInstitucion>
      <CodigoSeguridad>${this.config.codigoSeguridad}</CodigoSeguridad>
      <UsuarioInstitucion>${this.config.usuarioInstitucion}</UsuarioInstitucion>
    </Qry_InfCompletaInscripcion>`;
  }

  /**
   * Construye el cuerpo SOAP para inscripción de nacimiento
   */
  private buildInscripcionNacimientoBody(numeroIdentidad: string): string {
    return `<Qry_InscripcionNacimiento xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>${numeroIdentidad}</NumeroIdentidad>
      <CodigoInstitucion>${this.config.codigoInstitucion}</CodigoInstitucion>
      <CodigoSeguridad>${this.config.codigoSeguridad}</CodigoSeguridad>
      <UsuarioInstitucion>${this.config.usuarioInstitucion}</UsuarioInstitucion>
    </Qry_InscripcionNacimiento>`;
  }

  /**
   * Construye el cuerpo SOAP para información complementaria de inscripción
   */
  private buildInfComplementariaInscripcionBody(
    numeroIdentidad: string
  ): string {
    return `<Qry_InfComplementariaInscripcion xmlns="https://servicios.rnp.hn">
      <NumeroIdentidad>${numeroIdentidad}</NumeroIdentidad>
      <CodigoInstitucion>${this.config.codigoInstitucion}</CodigoInstitucion>
      <CodigoSeguridad>${this.config.codigoSeguridad}</CodigoSeguridad>
      <UsuarioInstitucion>${this.config.usuarioInstitucion}</UsuarioInstitucion>
    </Qry_InfComplementariaInscripcion>`;
  }

  /**
   * Parsea la respuesta XML SOAP
   */
  private async parseSoapResponse(xmlResponse: string): Promise<any> {
    console.log("\n🔍 PARSEANDO RESPUESTA XML");
    console.log("-".repeat(80));

    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    try {
      const result = await parser.parseStringPromise(xmlResponse);

      console.log("✅ XML parseado exitosamente");
      console.log("📋 Estructura del Body:");
      console.log(
        JSON.stringify(result.Envelope.Body, null, 2).substring(0, 1000)
      );
      console.log("-".repeat(80) + "\n");

      return result.Envelope.Body;
    } catch (error) {
      console.log("❌ ERROR AL PARSEAR XML");
      console.log(`📋 Error: ${error}`);
      console.log(`📋 XML recibido (primeros 500 chars):`);
      console.log(xmlResponse.substring(0, 500));
      console.log("-".repeat(80) + "\n");

      throw new Error(`Error parsing SOAP response: ${error}`);
    }
  }

  /**
   * Realiza una llamada SOAP al servicio del RNP
   */
  private async makeSoapCall(
    action: string,
    soapBody: string
  ): Promise<string> {
    const soapEnvelope = this.buildSoapEnvelope(action, soapBody);
    const fullUrl = `${this.config.baseUrl}/API/WSinscripciones.asmx`;

    console.log("\n" + "=".repeat(80));
    console.log("🚀 INICIANDO LLAMADA SOAP AL RNP");
    console.log("=".repeat(80));

    try {
      // Diagnóstico DETALLADO: Todo lo que se va a enviar
      console.log(`📍 URL Completa: ${fullUrl}`);
      console.log(`🎯 SOAPAction: "https://servicios.rnp.hn/${action}"`);
      console.log(`🔐 Credenciales:`);
      console.log(`   - Institución: ${this.config.codigoInstitucion}`);
      console.log(`   - Usuario: ${this.config.usuarioInstitucion}`);
      console.log(
        `   - Seguridad: ${this.maskSecret(this.config.codigoSeguridad)}`
      );

      console.log("\n📤 SOAP ENVELOPE ENVIADO:");
      console.log("-".repeat(80));
      // Mostrar el XML con credenciales enmascaradas
      const maskedEnvelope = soapEnvelope.replace(
        new RegExp(this.config.codigoSeguridad, "g"),
        this.maskSecret(this.config.codigoSeguridad)
      );
      console.log(maskedEnvelope);
      console.log("-".repeat(80));

      console.log("\n⏳ Enviando request a RNP...");
      const startTime = Date.now();

      const response = await axios.post(fullUrl, soapEnvelope, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"https://servicios.rnp.hn/${action}"`,
        },
        timeout: 30000, // 30 segundos timeout
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`\n✅ RESPUESTA RECIBIDA (${duration}ms)`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📦 Content-Type: ${response.headers["content-type"]}`);
      console.log(
        `📏 Content-Length: ${response.headers["content-length"] || "N/A"}`
      );

      console.log("\n📥 SOAP RESPONSE XML:");
      console.log("-".repeat(80));
      // Mostrar los primeros 2000 caracteres del XML para diagnóstico
      const responsePreview = String(response.data).substring(0, 2000);
      console.log(responsePreview);
      if (String(response.data).length > 2000) {
        console.log(
          `\n... (${String(response.data).length - 2000} caracteres más)`
        );
      }
      console.log("-".repeat(80));
      console.log("=".repeat(80) + "\n");

      return response.data;
    } catch (error: any) {
      console.log("\n❌ ERROR EN LLAMADA SOAP");
      console.log("=".repeat(80));

      if (error.response) {
        // El servidor respondió con un código de error
        console.log(
          `📊 HTTP Status: ${error.response.status} ${error.response.statusText}`
        );
        console.log(`📍 URL: ${fullUrl}`);
        console.log(`📦 Response Headers:`);
        console.log(JSON.stringify(error.response.headers, null, 2));

        console.log("\n📥 Response Data:");
        console.log("-".repeat(80));
        console.log(error.response.data);
        console.log("-".repeat(80));

        throw new Error(
          `SOAP call failed: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        console.log("⚠️ No se recibió respuesta del servidor RNP");
        console.log(`📍 URL intentada: ${fullUrl}`);
        console.log(`⏱️ Timeout configurado: 30000ms`);
        console.log(`📋 Error code: ${error.code}`);
        console.log(`📋 Error message: ${error.message}`);
        console.log("=".repeat(80) + "\n");

        throw new Error("No response received from RNP service");
      } else {
        // Error al configurar la petición
        console.log("⚠️ Error al configurar la petición");
        console.log(`📋 Error: ${error.message}`);
        console.log(`📋 Stack: ${error.stack}`);
        console.log("=".repeat(80) + "\n");

        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  /**
   * Obtiene un certificado de nacimiento
   */
  async getCertificadoNacimiento(
    request: CertificadoNacimientoRequest
  ): Promise<RNPApiResponse<CertificadoNacimientoResponse>> {
    try {
      console.log(
        `🔍 Solicitando certificado de nacimiento para: ${request.numeroIdentidad}`
      );

      const soapBody = this.buildCertificadoNacimientoBody(
        request.numeroIdentidad
      );
      const xmlResponse = await this.makeSoapCall(
        "qry_CertificadoNacimiento",
        soapBody
      );

      console.log("📡 Respuesta XML recibida");

      const parsedResponse = await this.parseSoapResponse(xmlResponse);
      const result =
        parsedResponse.qry_CertificadoNacimientoResponse
          ?.qry_CertificadoNacimientoResult;

      console.log("\n🔎 ANALIZANDO RESULTADO PARSEADO");
      console.log("-".repeat(80));
      console.log("📋 Result completo:", JSON.stringify(result, null, 2));
      console.log("-".repeat(80));

      if (!result) {
        console.log("❌ RESULTADO VACÍO O INVÁLIDO");
        console.log(
          "📋 parsedResponse completo:",
          JSON.stringify(parsedResponse, null, 2)
        );
        return {
          success: false,
          error: "INVALID_RESPONSE",
          message: "Respuesta inválida del servicio RNP",
        };
      }

      // Verificar si hay errores en la respuesta
      if (result.DetalleError && result.DetalleError.TipoDeError) {
        console.log("⚠️ DETALLE DE ERROR EN RESPUESTA RNP:");
        console.log(`   - Tipo: ${result.DetalleError.TipoDeError}`);
        console.log(
          `   - Descripción: ${result.DetalleError.DescripcionError}`
        );

        return {
          success: false,
          error: result.DetalleError.TipoDeError,
          message:
            result.DetalleError.DescripcionError || "Error del servicio RNP",
        };
      }

      // Validar que se recibió el certificado
      if (!result.Certificado) {
        console.log("❌ NO SE RECIBIÓ CERTIFICADO EN LA RESPUESTA");
        console.log("📋 Campos presentes en result:", Object.keys(result));

        return {
          success: false,
          error: "NO_CERTIFICATE",
          message: "No se recibió el certificado de nacimiento",
        };
      }

      console.log("✅ CERTIFICADO ENCONTRADO");
      console.log(
        `   - NumeroIdentidad: ${
          result.NumeroIdentidad || request.numeroIdentidad
        }`
      );
      console.log(`   - GUID: ${result.GUID || "N/A"}`);
      console.log(
        `   - Certificado length: ${result.Certificado?.length || 0} bytes`
      );

      const response: CertificadoNacimientoResponse = {
        numeroIdentidad: result.NumeroIdentidad || request.numeroIdentidad,
        certificado: result.Certificado,
        guid: result.GUID || "",
        detalleError: result.DetalleError
          ? {
              tipoDeError: result.DetalleError.TipoDeError,
              descripcionError: result.DetalleError.DescripcionError,
            }
          : undefined,
      };

      console.log("✅ Certificado de nacimiento obtenido exitosamente");

      return {
        success: true,
        data: response,
        message: "Certificado de nacimiento obtenido exitosamente",
      };
    } catch (error: any) {
      console.log("\n❌ EXCEPCIÓN EN getCertificadoNacimiento");
      console.log("-".repeat(80));
      console.error("📋 Error:", error);
      console.error("📋 Stack:", error.stack);
      console.log("-".repeat(80) + "\n");

      return {
        success: false,
        error: "SERVICE_ERROR",
        message: `Error del servicio: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene el árbol genealógico
   */
  async getArbolGenealogico(
    request: ArbolGenealogicoRequest
  ): Promise<RNPApiResponse<ArbolGenealogicoResponse>> {
    try {
      console.log(
        `🌳 Solicitando árbol genealógico para: ${request.numeroIdentidad}`
      );

      const soapBody = this.buildArbolGenealogicoBody(request.numeroIdentidad);
      const xmlResponse = await this.makeSoapCall(
        "lst_ArbolGenealogico",
        soapBody
      );

      console.log("📡 Respuesta XML recibida");

      const parsedResponse = await this.parseSoapResponse(xmlResponse);
      const result =
        parsedResponse.lst_ArbolGenealogicoResponse?.lst_ArbolGenealogicoResult;

      if (!result) {
        return {
          success: false,
          error: "INVALID_RESPONSE",
          message: "Respuesta inválida del servicio RNP",
        };
      }

      // Verificar si hay errores en la respuesta
      if (result.DetalleError && result.DetalleError.TipoDeError) {
        return {
          success: false,
          error: result.DetalleError.TipoDeError,
          message:
            result.DetalleError.DescripcionError || "Error del servicio RNP",
        };
      }

      // Parsear el árbol genealógico
      let arbolGenealogico: PersonaArbol[] = [];

      if (result.ArbolGenealogico && result.ArbolGenealogico.Arbol) {
        // La estructura real del XML tiene <ArbolGenealogico><Arbol>...</Arbol></ArbolGenealogico>
        const arboles = result.ArbolGenealogico.Arbol;

        // Si es un array de elementos Arbol
        if (Array.isArray(arboles)) {
          arbolGenealogico = arboles.map((arbol: any) => ({
            orden: String(arbol.Orden || ""),
            numeroIdentidad: String(arbol.NumeroIdentidad || ""),
            nombreCompleto: String(arbol.NombreCompleto || ""),
            parentesco: String(arbol.Parentesco || ""),
          }));
        } else {
          // Si es un objeto único Arbol, convertir a array
          arbolGenealogico = [
            {
              orden: String(arboles.Orden || ""),
              numeroIdentidad: String(arboles.NumeroIdentidad || ""),
              nombreCompleto: String(arboles.NombreCompleto || ""),
              parentesco: String(arboles.Parentesco || ""),
            },
          ];
        }
      }

      const response: ArbolGenealogicoResponse = {
        numeroIdentidad: result.NumeroIdentidad || request.numeroIdentidad,
        arbolGenealogico,
        detalleError: result.DetalleError
          ? {
              tipoDeError: result.DetalleError.TipoDeError,
              descripcionError: result.DetalleError.DescripcionError,
            }
          : undefined,
      };

      console.log(
        `✅ Árbol genealógico obtenido exitosamente con ${arbolGenealogico.length} personas`
      );

      return {
        success: true,
        data: response,
        message: "Árbol genealógico obtenido exitosamente",
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo árbol genealógico:", error);

      return {
        success: false,
        error: "SERVICE_ERROR",
        message: `Error del servicio: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene la información completa de inscripción (inscrito y padres)
   */
  async getInfCompletaInscripcion(
    request: InfCompletaInscripcionRequest
  ): Promise<RNPApiResponse<InfCompletaInscripcionResponse>> {
    try {
      console.log(
        `📋 Solicitando información completa de inscripción para: ${request.numeroIdentidad}`
      );

      const soapBody = this.buildInfCompletaInscripcionBody(
        request.numeroIdentidad
      );
      const xmlResponse = await this.makeSoapCall(
        "Qry_InfCompletaInscripcion",
        soapBody
      );

      console.log("📡 Respuesta XML recibida");

      const parsedResponse = await this.parseSoapResponse(xmlResponse);
      const result =
        parsedResponse.Qry_InfCompletaInscripcionResponse
          ?.Qry_InfCompletaInscripcionResult;

      if (!result) {
        return {
          success: false,
          error: "INVALID_RESPONSE",
          message: "Respuesta inválida del servicio RNP",
        };
      }

      // Función auxiliar para parsear datos de persona
      const parsePersona = (personaData: any): PersonaCompleta => {
        return {
          numInscripcion: String(personaData?.NumInscripcion || ""),
          nombres: String(personaData?.Nombres || ""),
          primerApellido: String(personaData?.PrimerApellido || ""),
          segundoApellido: String(personaData?.SegundoApellido || ""),
          sexo: String(personaData?.Sexo || ""),
          fechaDeNacimiento: String(personaData?.FechaDeNacimiento || ""),
          estadoCivil: Number(personaData?.EstadoCivil || 0),
          estadoVivencia: Number(personaData?.EstadoVivencia || 0),
          fechaDeDefuncion: String(personaData?.FechaDeDefuncion || ""),
          errorMsg: personaData?.ErrorMsg
            ? {
                tipoDeError: String(personaData.ErrorMsg.TipoDeError || ""),
                descripcionError: String(
                  personaData.ErrorMsg.DescripcionError || ""
                ),
              }
            : undefined,
        };
      };

      // Verificar si hay errores globales en la respuesta
      if (result.DetalleError && result.DetalleError.TipoDeError) {
        return {
          success: false,
          error: result.DetalleError.TipoDeError,
          message:
            result.DetalleError.DescripcionError || "Error del servicio RNP",
        };
      }

      const response: InfCompletaInscripcionResponse = {
        numeroIdentidad: result.NumeroIdentidad || request.numeroIdentidad,
        inscripcion: parsePersona(result.Inscripcion),
        madre: parsePersona(result.Madre),
        padre: parsePersona(result.Padre),
        detalleError: result.DetalleError
          ? {
              tipoDeError: result.DetalleError.TipoDeError,
              descripcionError: result.DetalleError.DescripcionError,
            }
          : undefined,
      };

      console.log(
        "✅ Información completa de inscripción obtenida exitosamente"
      );

      return {
        success: true,
        data: response,
        message: "Información completa de inscripción obtenida exitosamente",
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo información completa:", error);

      return {
        success: false,
        error: "SERVICE_ERROR",
        message: `Error del servicio: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene la información de inscripción de nacimiento
   */
  async getInscripcionNacimiento(
    request: InscripcionNacimientoRequest
  ): Promise<RNPApiResponse<InscripcionNacimientoResponse>> {
    try {
      console.log(
        `📋 Solicitando información de inscripción de nacimiento para: ${request.numeroIdentidad}`
      );

      const soapBody = this.buildInscripcionNacimientoBody(
        request.numeroIdentidad
      );
      const xmlResponse = await this.makeSoapCall(
        "Qry_InscripcionNacimiento",
        soapBody
      );

      console.log("📡 Respuesta XML recibida");

      const parsedResponse = await this.parseSoapResponse(xmlResponse);
      const result =
        parsedResponse.Qry_InscripcionNacimientoResponse
          ?.Qry_InscripcionNacimientoResult;

      if (!result) {
        return {
          success: false,
          error: "INVALID_RESPONSE",
          message: "Respuesta inválida del servicio RNP",
        };
      }

      // Verificar si hay errores en la respuesta
      if (result.ErrorMsg && result.ErrorMsg.TipoDeError) {
        return {
          success: false,
          error: result.ErrorMsg.TipoDeError,
          message: result.ErrorMsg.DescripcionError || "Error del servicio RNP",
        };
      }

      const response: InscripcionNacimientoResponse = {
        numeroIdentidad: result.NumeroIdentidad || request.numeroIdentidad,
        numInscripcion: String(result.NumInscripcion || ""),
        nombres: String(result.Nombres || ""),
        primerApellido: String(result.PrimerApellido || ""),
        segundoApellido: String(result.SegundoApellido || ""),
        sexo: String(result.Sexo || ""),
        fechaDeNacimiento: String(result.FechaDeNacimiento || ""),
        estadoCivil: Number(result.EstadoCivil || 0),
        estadoVivencia: Number(result.EstadoVivencia || 0),
        fechaDeDefuncion: String(result.FechaDeDefuncion || ""),
        errorMsg: result.ErrorMsg
          ? {
              tipoDeError: String(result.ErrorMsg.TipoDeError || ""),
              descripcionError: String(result.ErrorMsg.DescripcionError || ""),
            }
          : undefined,
      };

      console.log(
        "✅ Información de inscripción de nacimiento obtenida exitosamente"
      );

      return {
        success: true,
        data: response,
        message:
          "Información de inscripción de nacimiento obtenida exitosamente",
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo información de inscripción:", error);

      return {
        success: false,
        error: "SERVICE_ERROR",
        message: `Error del servicio: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene la información complementaria de inscripción (incluye residencia y foto)
   */
  async getInfComplementariaInscripcion(
    request: InfComplementariaInscripcionRequest
  ): Promise<RNPApiResponse<InfComplementariaInscripcionResponse>> {
    try {
      console.log(
        `📋 Solicitando información complementaria de inscripción para: ${request.numeroIdentidad}`
      );

      const soapBody = this.buildInfComplementariaInscripcionBody(
        request.numeroIdentidad
      );
      const xmlResponse = await this.makeSoapCall(
        "Qry_InfComplementariaInscripcion",
        soapBody
      );

      console.log("📡 Respuesta XML recibida");

      const parsedResponse = await this.parseSoapResponse(xmlResponse);
      const result =
        parsedResponse.Qry_InfComplementariaInscripcionResponse
          ?.Qry_InfComplementariaInscripcionResult;

      if (!result) {
        return {
          success: false,
          error: "INVALID_RESPONSE",
          message: "Respuesta inválida del servicio RNP",
        };
      }

      // Verificar si hay errores en la respuesta
      if (result.ErrorMsg && result.ErrorMsg.TipoDeError) {
        return {
          success: false,
          error: String(result.ErrorMsg.TipoDeError || "SERVICE_ERROR"),
          message: String(
            result.ErrorMsg.DescripcionError || "Error del servicio RNP"
          ),
        };
      }

      const parsePersonaBasica = (personaData: any): PersonaBasica => ({
        numInscripcion: String(personaData?.NumInscripcion || ""),
        nombres: String(personaData?.Nombres || ""),
        primerApellido: String(personaData?.PrimerApellido || ""),
        segundoApellido: String(personaData?.SegundoApellido || ""),
        sexo: String(personaData?.Sexo || ""),
        fechaDeNacimiento: String(personaData?.FechaDeNacimiento || ""),
        estadoCivil: Number(personaData?.EstadoCivil || 0),
        estadoVivencia: Number(personaData?.EstadoVivencia || 0),
        fechaDeDefuncion: String(personaData?.FechaDeDefuncion || ""),
        errorMsg: personaData?.ErrorMsg
          ? {
              tipoDeError: String(personaData.ErrorMsg.TipoDeError || ""),
              descripcionError: String(
                personaData.ErrorMsg.DescripcionError || ""
              ),
            }
          : undefined,
      });

      const response: InfComplementariaInscripcionResponse = {
        numeroIdentidad: String(
          result.NumeroIdentidad || request.numeroIdentidad
        ),
        numInscripcion: String(result.NumInscripcion || ""),
        nombres: String(result.Nombres || ""),
        primerApellido: String(result.PrimerApellido || ""),
        segundoApellido: String(result.SegundoApellido || ""),
        sexo: String(result.Sexo || ""),
        fechaDeNacimiento: String(result.FechaDeNacimiento || ""),
        estadoCivil: Number(result.EstadoCivil || 0),
        descrEstadoCivil: String(result.DescrEstadoCivil || ""),
        estadoVivencia: Number(result.EstadoVivencia || 0),
        descrEstadoVivencia: String(result.DescrEstadoVivencia || ""),
        fechaDeDefuncion: String(result.FechaDeDefuncion || ""),
        paisNacimiento: result.PaisNacimiento
          ? Number(result.PaisNacimiento)
          : undefined,
        descrPaisNacimiento: String(result.DescrPaisNacimiento || ""),
        deptoNacimiento: result.DeptoNacimiento
          ? Number(result.DeptoNacimiento)
          : undefined,
        descrDeptoNacimiento: String(result.DescrDeptoNacimiento || ""),
        municNacimiento: result.MunicNacimiento
          ? Number(result.MunicNacimiento)
          : undefined,
        descrMunicNacimiento: String(result.DescrMunicNacimiento || ""),
        barrioNacimiento: result.BarrioNacimiento
          ? Number(result.BarrioNacimiento)
          : undefined,
        descrBarrioNacimiento: String(result.DescrBarrioNacimiento || ""),
        paisResidencia: Number(result.PaisResidencia || 0),
        descrPaisResidencia: String(result.DescrPaisResidencia || ""),
        deptoResidencia: Number(result.DeptoResidencia || 0),
        descrDeptoResidencia: String(result.DescrDeptoResidencia || ""),
        municResidencia: Number(result.MunicResidencia || 0),
        descrMunicResidencia: String(result.DescrMunicResidencia || ""),
        barrioResidencia: Number(result.BarrioResidencia || 0),
        descrBarrioResidencia: String(result.DescrBarrioResidencia || ""),
        direccionResidencia: String(result.DireccionResidencia || ""),
        ocupacionLaboral: Number(result.OcupacionLaboral || 0),
        descrOcupacionLaboral: String(result.DescrOcupacionLaboral || ""),
        numeroTelefono: String(result.NumeroTelefono || ""),
        telefonoCelular: String(result.TelefonoCelular || ""),
        correoElectronico: String(result.CorreoElectronico || ""),
        madre: result.Madre ? parsePersonaBasica(result.Madre) : undefined,
        padre: result.Padre ? parsePersonaBasica(result.Padre) : undefined,
        errorMsg: undefined,
        foto: String(result.Foto || ""),
        fotoError: result.FotoError
          ? {
              tipoDeError: String(result.FotoError.TipoDeError || ""),
              descripcionError: String(result.FotoError.DescripcionError || ""),
            }
          : undefined,
      };

      return {
        success: true,
        data: response,
        message:
          "Información complementaria de inscripción obtenida exitosamente",
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo información complementaria:", error);
      return {
        success: false,
        error: "SERVICE_ERROR",
        message: `Error del servicio: ${error.message}`,
      };
    }
  }

  /**
   * Método para probar la conectividad con el servicio
   */
  async testConnection(): Promise<RNPApiResponse<null>> {
    try {
      // Usar una identidad de prueba válida
      const testRequest: CertificadoNacimientoRequest = {
        numeroIdentidad: "40212345678", // ID de prueba
      };

      const response = await this.getCertificadoNacimiento(testRequest);

      if (response.success) {
        return {
          success: true,
          message: "Conexión con el servicio RNP exitosa",
        };
      } else {
        return {
          success: false,
          error: response.error,
          message: `Prueba de conexión falló: ${response.message}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "CONNECTION_ERROR",
        message: `Error de conexión: ${error.message}`,
      };
    }
  }
}

// Factory para crear instancia del servicio
export function createRNPService(
  customConfig?: Partial<RNPConfig>
): RNPService {
  const config: RNPConfig = {
    baseUrl:
      customConfig?.baseUrl ||
      process.env.RNP_BASE_URL ||
      "https://wstest.rnp.hn:1893",
    codigoInstitucion:
      customConfig?.codigoInstitucion ||
      process.env.RNP_CODIGO_INSTITUCION ||
      "",
    codigoSeguridad:
      customConfig?.codigoSeguridad || process.env.RNP_CODIGO_SEGURIDAD || "",
    usuarioInstitucion:
      customConfig?.usuarioInstitucion ||
      process.env.RNP_USUARIO_INSTITUCION ||
      "",
  };

  // Validar configuración
  if (
    !config.codigoInstitucion ||
    !config.codigoSeguridad ||
    !config.usuarioInstitucion
  ) {
    throw new Error(
      "RNP configuration is incomplete. Please provide all required credentials: codigoInstitucion, codigoSeguridad, usuarioInstitucion."
    );
  }

  return new RNPService(config);
}

export default RNPService;
