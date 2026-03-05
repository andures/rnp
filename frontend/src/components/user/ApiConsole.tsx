import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Card,
  CardContent,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Storage as DatabaseIcon,
  Favorite as HeartIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Error as XCircleIcon,
  Close as CloseIcon,
  Assignment as CertificateIcon,
  CalendarToday as CalendarIcon,
  Fingerprint as FingerprintIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  FamilyRestroom as FamilyRestroomIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";

import { useAuth } from "../../hooks/useAuth";
import { rnpAPI } from "../../services/api";
import SessionLogService from "../../services/sessionLog";

interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters: string[];
}

interface QueryResult {
  id: string;
  endpoint: string;
  query: string;
  timestamp: string;
  result: Record<string, unknown>;
  status: "success" | "error";
  userId: string;
}

// Interface extendida para manejar respuestas mock
interface ExtendedApiResponse {
  success: boolean;
  data?: {
    numeroIdentidad?: string;
    certificado?: string;
    guid?: string;
    timestamp?: string;
    consulta?: string;
    parametrosUsados?: Record<string, string>;
    esMock?: boolean;
    motivoMock?: string;
    instrucciones?: {
      paso1: string;
      paso2: string;
      paso3: string;
      paso4: string;
    };
    errorRNPOriginal?: {
      codigo: string;
      mensaje: string;
    };
  };
  error?: string;
  message?: string;
}

const ApiConsole: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  // Mapeo de nombres técnicos a nombres amigables para mostrar en UI
  const friendlyNameMap: Record<string, string> = {
    qry_CertificadoNacimiento: "Certificado de nacimiento",
    lst_ArbolGenealogico: "Árbol genealógico",
    Qry_InfCompletaInscripcion: "Información completa de inscripción",
    Qry_InfComplementariaInscripcion:
      "Información complementaria de inscripción",
    Qry_InscripcionNacimiento: "Inscripción de nacimiento",
  };

  const getFriendlyName = (name: string) => friendlyNameMap[name] || name;
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    null
  );
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<QueryResult | null>(
    null
  );
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [dailyQueryCount, setDailyQueryCount] = useState(0);

  // Límite diario de consultas para todos los usuarios
  const DAILY_QUERY_LIMIT = 100;
  const RESET_HOUR = 5; // 5 AM

  const apiEndpoints: ApiEndpoint[] = [
    {
      id: "certificadoNacimiento",
      name: "qry_CertificadoNacimiento",
      description:
        "Retorna una certificación de nacimiento con una marca de agua",
      endpoint: "/api/rnp/certificado-nacimiento",
      method: "POST",
      parameters: [
        "numeroIdentidad",
        "codigoInstitucion",
        "codigoSeguridad",
        "usuarioInstitucion",
      ],
    },
    {
      id: "arbolGenealogico",
      name: "lst_ArbolGenealogico",
      description:
        "Retorna el árbol genealógico de un inscrito (datos familiares)",
      endpoint: "/api/rnp/arbol-genealogico",
      method: "POST",
      parameters: [
        "numeroIdentidad",
        "codigoInstitucion",
        "codigoSeguridad",
        "usuarioInstitucion",
      ],
    },
    {
      id: "infCompletaInscripcion",
      name: "Qry_InfCompletaInscripcion",
      description:
        "Retorna información completa de la inscripción (inscrito y padres)",
      endpoint: "/api/rnp/inf-completa-inscripcion",
      method: "POST",
      parameters: [
        "numeroIdentidad",
        "codigoInstitucion",
        "codigoSeguridad",
        "usuarioInstitucion",
      ],
    },
    {
      id: "infComplementariaInscripcion",
      name: "Qry_InfComplementariaInscripcion",
      description:
        "Retorna info complementaria: residencia, contactos y foto (si existe)",
      endpoint: "/api/rnp/inf-complementaria-inscripcion",
      method: "POST",
      parameters: [
        "numeroIdentidad",
        "codigoInstitucion",
        "codigoSeguridad",
        "usuarioInstitucion",
      ],
    },
    {
      id: "inscripcionNacimiento",
      name: "Qry_InscripcionNacimiento",
      description:
        "Retorna la información de una inscripción basado en su número de identidad",
      endpoint: "/api/rnp/inscripcion-nacimiento",
      method: "POST",
      parameters: [
        "numeroIdentidad",
        "codigoInstitucion",
        "codigoSeguridad",
        "usuarioInstitucion",
      ],
    },
  ];

  const getEndpointIcon = (endpointId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      certificadoNacimiento: <CertificateIcon />,
      arbolGenealogico: <FamilyRestroomIcon />,
      infCompletaInscripcion: <HeartIcon />,
      inscripcionNacimiento: <DatabaseIcon />,
    };
    return iconMap[endpointId] || <DatabaseIcon />;
  };

  useEffect(() => {
    loadResults();
    initializeDailyCounter();

    // Cleanup function para limpiar URLs de PDF cuando el componente se desmonte
    return () => {
      // Limpiar cualquier URL de objeto que pueda quedar en memoria
      const elements = document.querySelectorAll('iframe[src^="blob:"]');
      elements.forEach((iframe) => {
        const src = (iframe as HTMLIFrameElement).src;
        if (src.startsWith("blob:")) {
          window.URL.revokeObjectURL(src);
        }
      });
    };
  }, []);

  const initializeDailyCounter = () => {
    const storedCount = localStorage.getItem("dailyQueryCount");
    const storedDate = localStorage.getItem("lastResetDate");
    const today = new Date();

    // Crear fecha de reset para hoy a las 5 AM
    const resetTime = new Date(today);
    resetTime.setHours(RESET_HOUR, 0, 0, 0);

    // Si es después de las 5 AM, el reset es hoy, si no, fue ayer
    if (today.getHours() < RESET_HOUR) {
      resetTime.setDate(resetTime.getDate() - 1);
    }

    const resetDateString = resetTime.toDateString();

    // Si no hay fecha almacenada o la fecha cambió, reiniciar contador
    if (!storedDate || storedDate !== resetDateString) {
      setDailyQueryCount(0);
      localStorage.setItem("dailyQueryCount", "0");
      localStorage.setItem("lastResetDate", resetDateString);
    } else {
      setDailyQueryCount(parseInt(storedCount || "0"));
    }
  };

  const incrementQueryCount = () => {
    const newCount = dailyQueryCount + 1;
    setDailyQueryCount(newCount);
    localStorage.setItem("dailyQueryCount", newCount.toString());
  };

  const getRemainingQueries = () => {
    return Math.max(0, DAILY_QUERY_LIMIT - dailyQueryCount);
  };

  const getNextResetTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(RESET_HOUR, 0, 0, 0);
    return tomorrow.toLocaleString("es-ES");
  };

  const loadResults = () => {
    const storedResults = JSON.parse(
      localStorage.getItem("queryResults") || "[]"
    );
    setResults(
      storedResults.sort(
        (a: QueryResult, b: QueryResult) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  };

  const handleExecuteQuery = async () => {
    if (!selectedEndpoint || !user) return;

    // Verificar límite diario de consultas
    if (dailyQueryCount >= DAILY_QUERY_LIMIT) {
      const result = {
        success: false,
        error: "LIMITE_DIARIO_EXCEDIDO",
        message: `Se ha alcanzado el límite diario de ${DAILY_QUERY_LIMIT} consultas para todos los usuarios. El contador se reinicia mañana a las 5:00 AM.`,
        timestamp: new Date().toISOString(),
        consulta: selectedEndpoint.name,
        parametrosUsados: queryParams,
        proximoReinicio: getNextResetTime(),
        consultasRestantes: 0,
      };

      const newResult: QueryResult = {
        id: Date.now().toString(),
        endpoint: selectedEndpoint.name,
        query: JSON.stringify(queryParams),
        timestamp: new Date().toISOString(),
        result: result,
        status: "error",
        userId: user.id,
      };

      const updatedResults = [newResult, ...results];
      setResults(updatedResults);
      localStorage.setItem("queryResults", JSON.stringify(updatedResults));
      return;
    }

    setIsLoading(true);

    try {
      let result;

      // Verificar si es uno de los endpoints del RNP que requieren credenciales
      if (selectedEndpoint.parameters.includes("codigoInstitucion")) {
        const numeroIdentidad = queryParams.numeroIdentidad;

        if (!numeroIdentidad) {
          result = {
            success: false,
            error: "PARAMETRO_REQUERIDO",
            message: "El número de identidad es requerido",
            timestamp: new Date().toISOString(),
            consulta: selectedEndpoint.name,
            parametrosUsados: queryParams,
          };
        } else {
          try {
            // Verificar qué endpoint está siendo ejecutado
            if (selectedEndpoint.id === "certificadoNacimiento") {
              // Llamar a la API real del RNP con credenciales del formulario
              const response = (await rnpAPI.getCertificadoNacimiento({
                numeroIdentidad,
                codigoInstitucion: queryParams.codigoInstitucion || "",
                codigoSeguridad: queryParams.codigoSeguridad || "",
                usuarioInstitucion: queryParams.usuarioInstitucion || "",
              })) as ExtendedApiResponse;

              result = {
                success: response.success,
                data: response.data,
                error: response.error,
                message: response.message,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                // Información adicional sobre el modo de operación
                modoOperacion: response.data?.esMock ? "MOCK/DEMO" : "RNP_REAL",
                esMock: response.data?.esMock || false,
                motivoMock: response.data?.motivoMock,
                instrucciones: response.data?.instrucciones,
              };
            } else if (selectedEndpoint.id === "arbolGenealogico") {
              // Llamar a la API del árbol genealógico con credenciales del formulario
              const response = (await rnpAPI.getArbolGenealogico({
                numeroIdentidad,
                codigoInstitucion: queryParams.codigoInstitucion || "",
                codigoSeguridad: queryParams.codigoSeguridad || "",
                usuarioInstitucion: queryParams.usuarioInstitucion || "",
              })) as ExtendedApiResponse;

              result = {
                success: response.success,
                data: response.data,
                error: response.error,
                message: response.message,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                // Información adicional sobre el modo de operación
                modoOperacion: response.data?.esMock ? "MOCK/DEMO" : "RNP_REAL",
                esMock: response.data?.esMock || false,
                motivoMock: response.data?.motivoMock,
              };
            } else if (selectedEndpoint.id === "infCompletaInscripcion") {
              // Llamar a la API de información completa de inscripción con credenciales del formulario
              const response = (await rnpAPI.getInfCompletaInscripcion({
                numeroIdentidad,
                codigoInstitucion: queryParams.codigoInstitucion || "",
                codigoSeguridad: queryParams.codigoSeguridad || "",
                usuarioInstitucion: queryParams.usuarioInstitucion || "",
              })) as ExtendedApiResponse;

              result = {
                success: response.success,
                data: response.data,
                error: response.error,
                message: response.message,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                // Información adicional sobre el modo de operación
                modoOperacion: response.data?.esMock ? "MOCK/DEMO" : "RNP_REAL",
                esMock: response.data?.esMock || false,
                motivoMock: response.data?.motivoMock,
              };
            } else if (selectedEndpoint.id === "inscripcionNacimiento") {
              // Llamar a la API de información de inscripción de nacimiento con credenciales del formulario
              const response = (await rnpAPI.getInscripcionNacimiento({
                numeroIdentidad,
                codigoInstitucion: queryParams.codigoInstitucion || "",
                codigoSeguridad: queryParams.codigoSeguridad || "",
                usuarioInstitucion: queryParams.usuarioInstitucion || "",
              })) as ExtendedApiResponse;

              result = {
                success: response.success,
                data: response.data,
                error: response.error,
                message: response.message,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                // Información adicional sobre el modo de operación
                modoOperacion: response.data?.esMock ? "MOCK/DEMO" : "RNP_REAL",
                esMock: response.data?.esMock || false,
                motivoMock: response.data?.motivoMock,
              };
            } else if (selectedEndpoint.id === "infComplementariaInscripcion") {
              // Llamar a la API de información complementaria con credenciales del formulario
              const response = (await rnpAPI.getInfComplementariaInscripcion({
                numeroIdentidad,
                codigoInstitucion: queryParams.codigoInstitucion || "",
                codigoSeguridad: queryParams.codigoSeguridad || "",
                usuarioInstitucion: queryParams.usuarioInstitucion || "",
              })) as ExtendedApiResponse;

              result = {
                success: response.success,
                data: response.data,
                error: response.error,
                message: response.message,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                // Información adicional sobre el modo de operación
                modoOperacion: response.data?.esMock ? "MOCK/DEMO" : "RNP_REAL",
                esMock: response.data?.esMock || false,
                motivoMock: response.data?.motivoMock,
              };
            } else {
              // Para las otras APIs, mostrar mensaje de que están pendientes de implementación
              result = {
                success: false,
                error: "ENDPOINT_PENDIENTE",
                message: `El endpoint ${selectedEndpoint.name} está pendiente de implementación en el backend`,
                timestamp: new Date().toISOString(),
                consulta: selectedEndpoint.name,
                parametrosUsados: queryParams,
                modoOperacion: "PENDIENTE",
                esMock: false,
                instrucciones: {
                  paso1: `Implementar endpoint ${selectedEndpoint.endpoint} en el backend`,
                  paso2: "Configurar el servicio RNP para esta consulta",
                  paso3: "Actualizar el frontend para llamar al nuevo endpoint",
                  paso4: "Realizar pruebas con credenciales oficiales",
                },
              };
            }
          } catch (error: unknown) {
            console.error("❌ Error llamando API del RNP:", error);
            const errorMessage =
              error instanceof Error ? error.message : "Error desconocido";
            result = {
              success: false,
              error: "API_ERROR",
              message: `Error de conexión: ${errorMessage}`,
              timestamp: new Date().toISOString(),
              consulta: selectedEndpoint.name,
              parametrosUsados: queryParams,
            };
          }
        }
      } else {
        // Simular delay para otros endpoints
        await new Promise((resolve) => setTimeout(resolve, 1000));

        result = {
          success: true,
          data: {
            numeroIdentidad: queryParams.numeroIdentidad || "0801199723598",
            mensaje: "Datos de prueba para " + selectedEndpoint.name,
          },
          timestamp: new Date().toISOString(),
          consulta: selectedEndpoint.name,
          parametrosUsados: queryParams,
        };
      }

      const newResult: QueryResult = {
        id: Date.now().toString(),
        endpoint: selectedEndpoint.name,
        query: JSON.stringify(queryParams),
        timestamp: new Date().toISOString(),
        result: result,
        status: result.success ? "success" : "error",
        userId: user.id,
      };

      const updatedResults = [newResult, ...results];
      setResults(updatedResults);
      localStorage.setItem("queryResults", JSON.stringify(updatedResults));

      // Abrir automáticamente el modal si la consulta fue exitosa
      if (
        result.success &&
        (selectedEndpoint.id === "certificadoNacimiento" ||
          selectedEndpoint.id === "arbolGenealogico" ||
          selectedEndpoint.id === "infCompletaInscripcion" ||
          selectedEndpoint.id === "inscripcionNacimiento" ||
          selectedEndpoint.id === "infComplementariaInscripcion")
      ) {
        setSelectedResult(newResult);
        setOpenResultDialog(true);
      }

      // Incrementar contador solo si la consulta fue exitosa y es una consulta real del RNP
      if (
        result.success &&
        selectedEndpoint.parameters.includes("codigoInstitucion")
      ) {
        incrementQueryCount();
      }
    } catch (error) {
      console.error("Query execution error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (param: string, value: string) => {
    if (
      param.toLowerCase().includes("identidad") ||
      param.toLowerCase().includes("serie")
    ) {
      const numbersOnly = value.replace(/\D/g, "");
      setQueryParams((prev) => ({ ...prev, [param]: numbersOnly }));
    } else {
      setQueryParams((prev) => ({ ...prev, [param]: value }));
    }
  };

  const handleViewResult = (result: QueryResult) => {
    setSelectedResult(result);
    setOpenResultDialog(true);

    // Registrar la visualización de resultados
    SessionLogService.logViewResult(result.id, result.endpoint);
  };

  const renderCertificadoNacimiento = (data: Record<string, unknown>) => {
    // Verificar si tenemos la estructura esperada del certificado
    if (!data || typeof data !== "object") {
      return null;
    }

    // Extraer datos del certificado usando acceso seguro
    const certificadoData =
      (data as { data?: Record<string, unknown> }).data || data;
    const parametrosUsados = (
      data as { parametrosUsados?: Record<string, unknown> }
    ).parametrosUsados;

    const numeroIdentidad = String(
      (certificadoData as Record<string, unknown>)?.numeroIdentidad ||
        parametrosUsados?.numeroIdentidad ||
        ""
    );
    const esMock = Boolean(
      (certificadoData as Record<string, unknown>)?.esMock ||
        (data as { esMock?: boolean }).esMock
    );
    const motivoMock = String(
      (certificadoData as Record<string, unknown>)?.motivoMock ||
        (data as { motivoMock?: string }).motivoMock ||
        ""
    );

    // Extraer el certificado PDF en base64
    const certificadoBase64 = String(
      (certificadoData as Record<string, unknown>)?.certificado || ""
    );

    // Función para imprimir el PDF
    const imprimirPDF = () => {
      if (!certificadoBase64) {
        alert("No hay certificado disponible para imprimir");
        return;
      }

      try {
        // Crear un blob del PDF
        const byteCharacters = atob(certificadoBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        // Crear URL del blob y abrir en nueva ventana para imprimir
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank");

        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();

            // Registrar la impresión en los logs
            SessionLogService.logPrint(
              `Certificado_Nacimiento_${numeroIdentidad}.pdf`,
              true
            );
          };
        } else {
          alert(
            "Por favor, permite las ventanas emergentes para imprimir el certificado"
          );

          // Registrar intento fallido de impresión
          SessionLogService.logPrint(
            `Certificado_Nacimiento_${numeroIdentidad}.pdf`,
            false
          );
        }

        // Limpiar el URL después de un tiempo
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 10000);
      } catch (error) {
        console.error("Error al imprimir el PDF:", error);
        alert("Error al procesar el certificado PDF para impresión");

        // Registrar error de impresión
        SessionLogService.logPrint(
          `Certificado_Nacimiento_${numeroIdentidad}.pdf`,
          false
        );
      }
    };

    // Crear URL del PDF para mostrar en iframe
    const pdfUrl = certificadoBase64
      ? (() => {
          try {
            const byteCharacters = atob(certificadoBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            return window.URL.createObjectURL(blob);
          } catch (error) {
            console.error("Error al crear URL del PDF:", error);
            return null;
          }
        })()
      : null;

    return (
      <Box sx={{ space: 3 }}>
        {/* Información del certificado */}
        <Card
          sx={{
            mb: 3,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <CertificateIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Certificado de Nacimiento
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FingerprintIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Número de Identidad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {numeroIdentidad || "No disponible"}
                  </Typography>
                </Box>
              </Box>

              {certificadoBase64 && certificadoBase64 !== "" && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PdfIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Certificado PDF
                    </Typography>
                    <Typography variant="body1">
                      Disponible (
                      {Math.round((certificadoBase64.length * 3) / 4 / 1024)}{" "}
                      KB)
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Estado del certificado */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <CheckCircleIcon sx={{ mr: 1, color: "success.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Estado de la Consulta
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Chip
                label="Certificado Generado Exitosamente"
                color="success"
                icon={<CheckCircleIcon />}
              />
              {esMock && (
                <Chip label="Modo Demostración" color="warning" size="small" />
              )}
            </Box>

            <Typography variant="body1" sx={{ mb: 2 }}>
              ✅ El certificado de nacimiento ha sido generado exitosamente con
              marca de agua oficial.
            </Typography>

            {/* Botón de impresión del PDF */}
            {certificadoBase64 && certificadoBase64 !== "" && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PrintIcon />}
                  onClick={imprimirPDF}
                  sx={{ mr: 2 }}
                >
                  Imprimir Certificado
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  �️ Documento oficial con marca de agua • Tamaño:{" "}
                  {Math.round((certificadoBase64.length * 3) / 4 / 1024)} KB
                </Typography>
              </Box>
            )}

            {esMock && motivoMock && motivoMock !== "" && (
              <Box
                sx={{
                  p: 2,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "warning.dark"
                      : "warning.light",
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  color="warning.contrastText"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  ℹ️ Información del Modo Demo:
                </Typography>
                <Typography variant="body2" color="warning.contrastText">
                  {motivoMock}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Visualización del PDF */}
        {certificadoBase64 && certificadoBase64 !== "" && pdfUrl && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Vista Previa del Certificado
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PrintIcon />}
                  onClick={imprimirPDF}
                >
                  Imprimir
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Certificado oficial de nacimiento con marca de agua del RNP.
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  height: "600px",
                  border: "1px solid",
                  borderColor:
                    theme.palette.mode === "dark" ? "grey.700" : "grey.300",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <iframe
                  src={pdfUrl}
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                  title="Certificado de Nacimiento"
                />
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const renderArbolGenealogico = (data: Record<string, unknown>) => {
    // Verificar si tenemos la estructura esperada del árbol genealógico
    if (!data || typeof data !== "object") {
      return null;
    }

    // Extraer datos del árbol genealógico usando acceso seguro
    const arbolData = (data as { data?: Record<string, unknown> }).data || data;
    const parametrosUsados = (
      data as { parametrosUsados?: Record<string, unknown> }
    ).parametrosUsados;

    const numeroIdentidad = String(
      (arbolData as Record<string, unknown>)?.numeroIdentidad ||
        parametrosUsados?.numeroIdentidad ||
        ""
    );
    const timestamp = (arbolData as Record<string, unknown>)
      ?.timestamp as string;
    const esMock = Boolean(
      (arbolData as Record<string, unknown>)?.esMock ||
        (data as { esMock?: boolean }).esMock
    );
    const motivoMock = String(
      (arbolData as Record<string, unknown>)?.motivoMock ||
        (data as { motivoMock?: string }).motivoMock ||
        ""
    );

    // Extraer el árbol genealógico
    const arbolGenealogico =
      ((arbolData as Record<string, unknown>)?.arbolGenealogico as Array<{
        orden: string;
        numeroIdentidad: string;
        nombreCompleto: string;
        parentesco: string;
      }>) || [];

    // Función para obtener el icono del parentesco
    const getParentescoIcon = (parentesco: string) => {
      const parentescoLower = parentesco.toLowerCase();
      if (
        parentescoLower.includes("principal") ||
        parentescoLower.includes("titular")
      )
        return "👤";
      if (parentescoLower.includes("madre")) return "👩";
      if (parentescoLower.includes("padre")) return "👨";
      if (parentescoLower.includes("abuela")) return "👵";
      if (parentescoLower.includes("abuelo")) return "👴";
      if (
        parentescoLower.includes("hermana") ||
        parentescoLower.includes("hermano")
      )
        return "👫";
      if (parentescoLower.includes("hijo") || parentescoLower.includes("hija"))
        return "�";
      if (parentescoLower.includes("tio") || parentescoLower.includes("tia"))
        return "👨‍👩‍👧‍👦";
      if (
        parentescoLower.includes("primo") ||
        parentescoLower.includes("prima")
      )
        return "�";
      return "👥";
    };

    // Función para obtener el color del parentesco
    const getParentescoColor = (parentesco: string) => {
      const parentescoLower = parentesco.toLowerCase();
      if (
        parentescoLower.includes("principal") ||
        parentescoLower.includes("titular")
      )
        return "primary.main";
      if (
        parentescoLower.includes("madre") ||
        parentescoLower.includes("padre")
      )
        return "secondary.main";
      if (
        parentescoLower.includes("abuela") ||
        parentescoLower.includes("abuelo")
      )
        return "info.main";
      if (
        parentescoLower.includes("hermana") ||
        parentescoLower.includes("hermano")
      )
        return "success.main";
      return "text.secondary";
    };

    // Función para formatear el parentesco de manera más amigable
    const formatParentesco = (parentesco: string) => {
      return parentesco
        .replace(/_/g, " ")
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    };

    return (
      <Box sx={{ space: 3 }}>
        {/* Información del árbol genealógico */}
        <Card
          sx={{
            mb: 3,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <FamilyRestroomIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Árbol Genealógico
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FingerprintIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Número de Identidad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {numeroIdentidad || "No disponible"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PeopleIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total de Personas
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {arbolGenealogico.length} persona
                    {arbolGenealogico.length !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Box>

              {timestamp && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AccessTimeIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Consulta
                    </Typography>
                    <Typography variant="body2">
                      {new Date(timestamp).toLocaleString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {esMock && motivoMock && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "warning.main",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="warning.contrastText"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  ℹ️ Información del Modo Demo:
                </Typography>
                <Typography variant="body2" color="warning.contrastText">
                  {motivoMock}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Lista del árbol genealógico */}
        {arbolGenealogico.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 3 }}>
                Información Familiar
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {arbolGenealogico
                  .sort((a, b) => {
                    // Ordenar por número de orden (convertir a número para ordenar correctamente)
                    const ordenA = parseInt(a.orden) || 0;
                    const ordenB = parseInt(b.orden) || 0;
                    return ordenA - ordenB;
                  })
                  .map((persona, index) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{
                        borderColor: getParentescoColor(persona.parentesco),
                        borderWidth: 2,
                        background: persona.parentesco
                          .toLowerCase()
                          .includes("principal")
                          ? "linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05))"
                          : "inherit",
                      }}
                    >
                      <CardContent sx={{ pb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Typography
                              variant="h4"
                              sx={{ mr: 2, fontSize: "2rem" }}
                            >
                              {getParentescoIcon(persona.parentesco)}
                            </Typography>
                            <Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: "bold",
                                  mb: 0.5,
                                  color: persona.parentesco
                                    .toLowerCase()
                                    .includes("principal")
                                    ? "primary.main"
                                    : "inherit",
                                }}
                              >
                                {persona.nombreCompleto}
                              </Typography>
                              <Chip
                                label={formatParentesco(persona.parentesco)}
                                size="small"
                                sx={{
                                  bgcolor: getParentescoColor(
                                    persona.parentesco
                                  ),
                                  color: "white",
                                  fontWeight: "bold",
                                }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Orden
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: "bold",
                                color:
                                  parseInt(persona.orden) === 0
                                    ? "primary.main"
                                    : "text.primary",
                              }}
                            >
                              {persona.orden}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <FingerprintIcon
                            sx={{
                              mr: 1,
                              color: "text.secondary",
                              fontSize: 16,
                            }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {persona.numeroIdentidad || "No disponible"}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const renderInfCompletaInscripcion = (data: Record<string, unknown>) => {
    // Verificar si tenemos la estructura esperada de información completa
    if (!data || typeof data !== "object") {
      return null;
    }

    // Extraer datos de la respuesta usando acceso seguro
    const inscripcionData =
      (data as { data?: Record<string, unknown> }).data || data;
    const parametrosUsados = (
      data as { parametrosUsados?: Record<string, unknown> }
    ).parametrosUsados;

    const numeroIdentidad = String(
      (inscripcionData as Record<string, unknown>)?.numeroIdentidad ||
        parametrosUsados?.numeroIdentidad ||
        ""
    );
    const timestamp = (inscripcionData as Record<string, unknown>)
      ?.timestamp as string;
    const esMock = Boolean(
      (inscripcionData as Record<string, unknown>)?.esMock ||
        (data as { esMock?: boolean }).esMock
    );
    const motivoMock = String(
      (inscripcionData as Record<string, unknown>)?.motivoMock ||
        (data as { motivoMock?: string }).motivoMock ||
        ""
    );

    // Extraer información de cada persona
    const inscripcion = (inscripcionData as Record<string, unknown>)
      ?.inscripcion as Record<string, unknown>;
    const madre = (inscripcionData as Record<string, unknown>)?.madre as Record<
      string,
      unknown
    >;
    const padre = (inscripcionData as Record<string, unknown>)?.padre as Record<
      string,
      unknown
    >;

    // Función para formatear el estado civil
    const formatEstadoCivil = (estado: number) => {
      const estados = {
        1: "Soltero(a)",
        2: "Casado(a)",
        3: "Unión Libre",
        4: "Separado(a)",
        5: "Divorciado(a)",
        6: "Viudo(a)",
      };
      return estados[estado as keyof typeof estados] || `Estado ${estado}`;
    };

    // Función para formatear el estado de vivencia
    const formatEstadoVivencia = (estado: number) => {
      const estados = {
        1: "Vivo(a)",
        2: "Fallecido(a)",
      };
      return estados[estado as keyof typeof estados] || `Estado ${estado}`;
    };

    // Función para obtener el color del estado de vivencia
    const getColorEstadoVivencia = (estado: number) => {
      return estado === 1 ? "success.main" : "error.main";
    };

    // Función para renderizar una persona
    const renderPersona = (
      persona: Record<string, unknown>,
      titulo: string,
      icono: string,
      color: string
    ) => {
      const nombres = String(persona?.nombres || "");
      const primerApellido = String(persona?.primerApellido || "");
      const segundoApellido = String(persona?.segundoApellido || "");
      const nombreCompleto =
        `${nombres} ${primerApellido} ${segundoApellido}`.trim();
      const sexo = String(persona?.sexo || "");
      const fechaNacimiento = String(persona?.fechaDeNacimiento || "");
      const estadoCivil = Number(persona?.estadoCivil || 0);
      const estadoVivencia = Number(persona?.estadoVivencia || 0);
      const numInscripcion = String(persona?.numInscripcion || "");

      return (
        <Card
          key={titulo}
          variant="outlined"
          sx={{
            borderColor: color,
            borderWidth: 2,
            mb: 2,
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography variant="h4" sx={{ mr: 2, fontSize: "2rem" }}>
                {icono}
              </Typography>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color:
                      titulo === "Inscrito(a)" ? "primary.main" : "inherit",
                  }}
                >
                  {titulo}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                  {nombreCompleto || "No disponible"}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {numInscripcion && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <FingerprintIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Número de Inscripción
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {numInscripcion}
                    </Typography>
                  </Box>
                </Box>
              )}

              {sexo && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ mr: 1, color: "text.secondary" }}
                  >
                    {sexo === "M" ? "♂️" : sexo === "F" ? "♀️" : "⚪"}
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sexo
                    </Typography>
                    <Typography variant="body2">
                      {sexo === "M"
                        ? "Masculino"
                        : sexo === "F"
                        ? "Femenino"
                        : "No especificado"}
                    </Typography>
                  </Box>
                </Box>
              )}

              {fechaNacimiento && fechaNacimiento !== "" && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Nacimiento
                    </Typography>
                    <Typography variant="body2">
                      {new Date(fechaNacimiento).toLocaleDateString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}

              {estadoCivil > 0 && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <HeartIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estado Civil
                    </Typography>
                    <Typography variant="body2">
                      {formatEstadoCivil(estadoCivil)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {estadoVivencia > 0 && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: getColorEstadoVivencia(estadoVivencia),
                      mr: 1,
                    }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estado de Vivencia
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getColorEstadoVivencia(estadoVivencia),
                        fontWeight: "bold",
                      }}
                    >
                      {formatEstadoVivencia(estadoVivencia)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      );
    };

    return (
      <Box sx={{ space: 3 }}>
        {/* Información general */}
        <Card
          sx={{
            mb: 3,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <HeartIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Información Completa de Inscripción
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FingerprintIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Número de Identidad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {numeroIdentidad || "No disponible"}
                  </Typography>
                </Box>
              </Box>

              {timestamp && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AccessTimeIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Consulta
                    </Typography>
                    <Typography variant="body2">
                      {new Date(timestamp).toLocaleString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {esMock && motivoMock && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "warning.main",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="warning.contrastText"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  ℹ️ Información del Modo Demo:
                </Typography>
                <Typography variant="body2" color="warning.contrastText">
                  {motivoMock}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Información del inscrito */}
        {inscripcion &&
          renderPersona(inscripcion, "Inscrito(a)", "👤", "primary.main")}

        {/* Información de la madre */}
        {madre && renderPersona(madre, "Madre", "👩", "secondary.main")}

        {/* Información del padre */}
        {padre && renderPersona(padre, "Padre", "👨", "info.main")}
      </Box>
    );
  };

  const renderInscripcionNacimiento = (data: Record<string, unknown>) => {
    // Verificar si tenemos la estructura esperada de inscripción
    if (!data || typeof data !== "object") {
      return null;
    }

    // Extraer datos de la respuesta usando acceso seguro
    const inscripcionData =
      (data as { data?: Record<string, unknown> }).data || data;
    const parametrosUsados = (
      data as { parametrosUsados?: Record<string, unknown> }
    ).parametrosUsados;

    const numeroIdentidad = String(
      (inscripcionData as Record<string, unknown>)?.numeroIdentidad ||
        parametrosUsados?.numeroIdentidad ||
        ""
    );
    const timestamp = (inscripcionData as Record<string, unknown>)
      ?.timestamp as string;
    const esMock = Boolean(
      (inscripcionData as Record<string, unknown>)?.esMock ||
        (data as { esMock?: boolean }).esMock
    );
    const motivoMock = String(
      (inscripcionData as Record<string, unknown>)?.motivoMock ||
        (data as { motivoMock?: string }).motivoMock ||
        ""
    );

    // Extraer información de la inscripción
    const numInscripcion = String(
      (inscripcionData as Record<string, unknown>)?.numInscripcion || ""
    );
    const nombres = String(
      (inscripcionData as Record<string, unknown>)?.nombres || ""
    );
    const primerApellido = String(
      (inscripcionData as Record<string, unknown>)?.primerApellido || ""
    );
    const segundoApellido = String(
      (inscripcionData as Record<string, unknown>)?.segundoApellido || ""
    );
    const sexo = String(
      (inscripcionData as Record<string, unknown>)?.sexo || ""
    );
    const fechaNacimiento = String(
      (inscripcionData as Record<string, unknown>)?.fechaDeNacimiento || ""
    );
    const estadoCivil = Number(
      (inscripcionData as Record<string, unknown>)?.estadoCivil || 0
    );
    const estadoVivencia = Number(
      (inscripcionData as Record<string, unknown>)?.estadoVivencia || 0
    );

    const nombreCompleto =
      `${nombres} ${primerApellido} ${segundoApellido}`.trim();

    // Función para formatear el estado civil
    const formatEstadoCivil = (estado: number) => {
      const estados = {
        1: "Soltero(a)",
        2: "Casado(a)",
        3: "Unión Libre",
        4: "Separado(a)",
        5: "Divorciado(a)",
        6: "Viudo(a)",
      };
      return estados[estado as keyof typeof estados] || `Estado ${estado}`;
    };

    // Función para formatear el estado de vivencia
    const formatEstadoVivencia = (estado: number) => {
      const estados = {
        1: "Vivo(a)",
        2: "Fallecido(a)",
      };
      return estados[estado as keyof typeof estados] || `Estado ${estado}`;
    };

    // Función para obtener el color del estado de vivencia
    const getColorEstadoVivencia = (estado: number) => {
      return estado === 1 ? "success.main" : "error.main";
    };

    return (
      <Box sx={{ space: 3 }}>
        {/* Información general */}
        <Card
          sx={{
            mb: 3,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <DatabaseIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Información de Inscripción de Nacimiento
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FingerprintIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Número de Identidad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {numeroIdentidad || "No disponible"}
                  </Typography>
                </Box>
              </Box>

              {timestamp && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AccessTimeIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Consulta
                    </Typography>
                    <Typography variant="body2">
                      {new Date(timestamp).toLocaleString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {esMock && motivoMock && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "warning.main",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="warning.contrastText"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  ℹ️ Información del Modo Demo:
                </Typography>
                <Typography variant="body2" color="warning.contrastText">
                  {motivoMock}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Información del inscrito */}
        <Card
          variant="outlined"
          sx={{
            borderColor: "primary.main",
            borderWidth: 2,
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography variant="h4" sx={{ mr: 2, fontSize: "2rem" }}>
                👤
              </Typography>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "primary.main",
                  }}
                >
                  Persona Inscrita
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                  {nombreCompleto || "No disponible"}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {numInscripcion && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <FingerprintIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Número de Inscripción
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {numInscripcion}
                    </Typography>
                  </Box>
                </Box>
              )}

              {sexo && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ mr: 1, color: "text.secondary" }}
                  >
                    {sexo === "M" ? "♂️" : sexo === "F" ? "♀️" : "⚪"}
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sexo
                    </Typography>
                    <Typography variant="body2">
                      {sexo === "M"
                        ? "Masculino"
                        : sexo === "F"
                        ? "Femenino"
                        : "No especificado"}
                    </Typography>
                  </Box>
                </Box>
              )}

              {fechaNacimiento && fechaNacimiento !== "" && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Nacimiento
                    </Typography>
                    <Typography variant="body2">
                      {new Date(fechaNacimiento).toLocaleDateString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}

              {estadoCivil > 0 && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <HeartIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estado Civil
                    </Typography>
                    <Typography variant="body2">
                      {formatEstadoCivil(estadoCivil)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {estadoVivencia > 0 && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: getColorEstadoVivencia(estadoVivencia),
                      mr: 1,
                    }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estado de Vivencia
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getColorEstadoVivencia(estadoVivencia),
                        fontWeight: "bold",
                      }}
                    >
                      {formatEstadoVivencia(estadoVivencia)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderInfComplementariaInscripcion = (
    data: Record<string, unknown>
  ) => {
    if (!data || typeof data !== "object") return null;

    const compData: Record<string, unknown> =
      (data as { data?: Record<string, unknown> }).data || data;
    const numeroIdentidad = String(
      (compData as Record<string, unknown>)?.numeroIdentidad || ""
    );
    const nombres = String(
      (compData as Record<string, unknown>)?.nombres || ""
    );
    const primerApellido = String(
      (compData as Record<string, unknown>)?.primerApellido || ""
    );
    const segundoApellido = String(
      (compData as Record<string, unknown>)?.segundoApellido || ""
    );
    const nombreCompleto =
      `${nombres} ${primerApellido} ${segundoApellido}`.trim();
    const sexo = String((compData as Record<string, unknown>)?.sexo || "");
    const fechaNacimiento = String(
      (compData as Record<string, unknown>)?.fechaDeNacimiento || ""
    );
    const direccionResidencia = String(
      (compData as Record<string, unknown>)?.direccionResidencia || ""
    );
    const descrDeptoResidencia = String(
      (compData as Record<string, unknown>)?.descrDeptoResidencia || ""
    );
    const descrMunicResidencia = String(
      (compData as Record<string, unknown>)?.descrMunicResidencia || ""
    );
    const barrioResidencia = String(
      (compData as Record<string, unknown>)?.descrBarrioResidencia || ""
    );
    const numeroTelefono = String(
      (compData as Record<string, unknown>)?.numeroTelefono || ""
    );
    const telefonoCelular = String(
      (compData as Record<string, unknown>)?.telefonoCelular || ""
    );
    const correoElectronico = String(
      (compData as Record<string, unknown>)?.correoElectronico || ""
    );
    const foto = String((compData as Record<string, unknown>)?.foto || "");

    return (
      <Box sx={{ space: 3 }}>
        <Card
          sx={{
            mb: 3,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <HeartIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Información Complementaria de Inscripción
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FingerprintIcon
                  sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Número de Identidad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {numeroIdentidad || "No disponible"}
                  </Typography>
                </Box>
              </Box>
              {fechaNacimiento && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Nacimiento
                    </Typography>
                    <Typography variant="body2">
                      {new Date(fechaNacimiento).toLocaleDateString("es-HN")}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Persona
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Nombre Completo
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {nombreCompleto || "No disponible"}
                </Typography>
              </Box>
              {sexo && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Sexo
                  </Typography>
                  <Typography variant="body1">
                    {sexo === "M"
                      ? "Masculino"
                      : sexo === "F"
                      ? "Femenino"
                      : sexo}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Residencia y Contacto
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Dirección
                </Typography>
                <Typography variant="body1">
                  {direccionResidencia || "No disponible"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {[
                    descrDeptoResidencia,
                    descrMunicResidencia,
                    barrioResidencia,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Teléfono
                </Typography>
                <Typography variant="body1">
                  {numeroTelefono || "No disponible"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Celular
                </Typography>
                <Typography variant="body1">
                  {telefonoCelular || "No disponible"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Correo
                </Typography>
                <Typography variant="body1">
                  {correoElectronico || "No disponible"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {foto && foto.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Fotografía
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <img
                  alt="Foto RNP"
                  src={`data:image/jpeg;base64,${foto}`}
                  style={{
                    width: 180,
                    height: 220,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);

    // No prellenar parámetros: dejar los campos vacíos
    setQueryParams({});
  };

  const isFormValid =
    selectedEndpoint?.parameters?.every((param) => queryParams[param]) ?? false;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 3,
        flexDirection: { xs: "column", lg: "row" },
      }}
    >
      {/* API Endpoints */}
      <Box sx={{ flex: { xs: 1, lg: "0 0 350px" } }}>
        <Paper sx={{ p: 3, height: "fit-content" }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
            Consultas Disponibles
          </Typography>

          <Box sx={{ maxHeight: 400, overflow: "auto" }}>
            <List>
              {apiEndpoints.map((endpoint, index) => (
                <React.Fragment key={endpoint.id}>
                  <ListItemButton
                    selected={selectedEndpoint?.id === endpoint.id}
                    onClick={() => handleEndpointSelect(endpoint)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      "&.Mui-selected": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light,
                      },
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "grey.800"
                            : "grey.100",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "primary.main" }}>
                      {getEndpointIcon(endpoint.id)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium" }}
                        >
                          {getFriendlyName(endpoint.name)}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {endpoint.description}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                  {index < apiEndpoints.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>
      </Box>

      {/* Query Console */}
      <Box sx={{ flex: 1 }}>
        {/* Banner de demostración removido */}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Consola de Consultas
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Chip
                label={`${getRemainingQueries()}/${DAILY_QUERY_LIMIT} consultas disponibles`}
                color={
                  getRemainingQueries() > 20
                    ? "success"
                    : getRemainingQueries() > 5
                    ? "warning"
                    : "error"
                }
                size="small"
                sx={{ fontSize: "0.75rem" }}
              />
            </Box>
          </Box>

          {selectedEndpoint ? (
            <Box>
              <Card
                sx={{
                  mb: 3,
                  bgcolor:
                    theme.palette.mode === "dark" ? "grey.800" : "grey.50",
                  border: theme.palette.mode === "dark" ? "1px solid" : "none",
                  borderColor:
                    theme.palette.mode === "dark" ? "grey.700" : "transparent",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {getFriendlyName(selectedEndpoint.name)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {selectedEndpoint.description}
                  </Typography>
                </CardContent>
              </Card>

              {selectedEndpoint.parameters && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    Parámetros
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {selectedEndpoint.parameters.map((param) => {
                      const getFieldInfo = (paramName: string) => {
                        switch (paramName) {
                          case "numeroIdentidad":
                            return {
                              placeholder:
                                "0801201316090 (número con datos de prueba)",
                              helperText:
                                "Número con árbol genealógico de ejemplo: 0801201316090",
                            };
                          case "codigoInstitucion":
                            return {
                              placeholder: "PRUEBAS (código oficial de prueba)",
                              helperText:
                                "Código de la institución autorizada (ej: PRUEBAS)",
                            };
                          case "codigoSeguridad":
                            return {
                              placeholder: "T3$T1NG (código oficial de prueba)",
                              helperText:
                                "Código de seguridad para autenticación (ej: T3$T1NG)",
                            };
                          case "usuarioInstitucion":
                            return {
                              placeholder:
                                "Usuario13 (usuario oficial de prueba)",
                              helperText:
                                "Usuario autorizado para consultas (ej: Usuario13)",
                            };
                          default:
                            return {
                              placeholder: `Ingrese ${param}...`,
                              helperText: undefined,
                            };
                        }
                      };

                      const fieldInfo = getFieldInfo(param);

                      return (
                        <TextField
                          key={param}
                          fullWidth
                          label={param}
                          value={queryParams[param] || ""}
                          onChange={(e) =>
                            handleParamChange(param, e.target.value)
                          }
                          placeholder={fieldInfo.placeholder}
                          size="small"
                          helperText={fieldInfo.helperText}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleExecuteQuery}
                disabled={
                  isLoading ||
                  !isFormValid ||
                  dailyQueryCount >= DAILY_QUERY_LIMIT
                }
                startIcon={
                  isLoading ? <CircularProgress size={20} /> : <PlayIcon />
                }
                fullWidth
                sx={{ textTransform: "none" }}
              >
                {isLoading
                  ? "Ejecutando..."
                  : dailyQueryCount >= DAILY_QUERY_LIMIT
                  ? "Límite diario alcanzado"
                  : "Ejecutar Consulta"}
              </Button>

              {dailyQueryCount >= DAILY_QUERY_LIMIT && (
                <Box
                  sx={{ mt: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}
                >
                  <Typography
                    variant="body2"
                    color="error.contrastText"
                    sx={{ fontWeight: "bold" }}
                  >
                    ⚠️ Límite diario alcanzado
                  </Typography>
                  <Typography variant="caption" color="error.contrastText">
                    Se han usado las {DAILY_QUERY_LIMIT} consultas diarias
                    permitidas para todos los usuarios. El contador se reinicia
                    automáticamente mañana a las 5:00 AM.
                  </Typography>
                  <Typography
                    variant="caption"
                    color="error.contrastText"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Próximo reinicio: {getNextResetTime()}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <DatabaseIcon
                sx={{
                  fontSize: 48,
                  color:
                    theme.palette.mode === "dark" ? "grey.600" : "grey.400",
                  mb: 2,
                }}
              />
              <Typography variant="body1" color="text.secondary">
                Seleccione una API para comenzar
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Results History */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
            Historial de Consultas
          </Typography>

          {results.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <ClockIcon
                sx={{
                  fontSize: 48,
                  color:
                    theme.palette.mode === "dark" ? "grey.600" : "grey.400",
                  mb: 2,
                }}
              />
              <Typography variant="body1" color="text.secondary">
                No hay consultas realizadas
              </Typography>
            </Box>
          ) : (
            <List>
              {results.slice(0, 1).map((result) => (
                <React.Fragment key={result.id}>
                  <ListItemButton
                    onClick={() => handleViewResult(result)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "grey.800"
                            : "grey.100",
                      },
                    }}
                  >
                    <ListItemIcon>
                      {result.status === "success" ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <XCircleIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium" }}
                        >
                          {result.endpoint === "qry_CertificadoNacimiento"
                            ? "Certificado de Nacimiento"
                            : result.endpoint === "lst_ArbolGenealogico"
                            ? "Árbol Genealógico"
                            : result.endpoint === "Qry_InfCompletaInscripcion"
                            ? "Información Completa"
                            : result.endpoint === "Qry_InscripcionNacimiento"
                            ? "Inscripción de Nacimiento"
                            : "Consulta RNP"}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(result.timestamp).toLocaleDateString(
                            "es-ES"
                          )}
                        </Typography>
                      }
                    />
                    <Chip
                      label={result.status}
                      color={result.status === "success" ? "success" : "error"}
                      size="small"
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Result Dialog */}
      <Dialog
        open={openResultDialog}
        onClose={() => setOpenResultDialog(false)}
        maxWidth="lg"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {selectedResult?.status === "success" &&
          selectedResult?.endpoint === "qry_CertificadoNacimiento"
            ? "🎉 Certificado de Nacimiento Obtenido"
            : selectedResult?.status === "success" &&
              selectedResult?.endpoint === "lst_ArbolGenealogico"
            ? "🌳 Árbol Genealógico Obtenido"
            : selectedResult?.status === "success" &&
              selectedResult?.endpoint === "Qry_InfCompletaInscripcion"
            ? "📋 Información Completa de Inscripción Obtenida"
            : selectedResult?.status === "success" &&
              selectedResult?.endpoint === "Qry_InfComplementariaInscripcion"
            ? "📌 Información Complementaria de Inscripción Obtenida"
            : "Resultado de Consulta"}
          <IconButton onClick={() => setOpenResultDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedResult && (
            <Box sx={{ space: 2 }}>
              {/* Solo mostrar el estado sin información técnica */}
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 3 }}>
                <strong>Estado:</strong>{" "}
                <Chip
                  label={
                    selectedResult.status === "success" ? "Éxito" : "Error"
                  }
                  color={
                    selectedResult.status === "success" ? "success" : "error"
                  }
                  size="small"
                />
              </Typography>

              {/* Renderizado especial para certificado de nacimiento exitoso */}
              {selectedResult.status === "success" &&
              selectedResult.endpoint === "qry_CertificadoNacimiento" ? (
                renderCertificadoNacimiento(selectedResult.result)
              ) : selectedResult.status === "success" &&
                selectedResult.endpoint === "lst_ArbolGenealogico" ? (
                renderArbolGenealogico(selectedResult.result)
              ) : selectedResult.status === "success" &&
                selectedResult.endpoint === "Qry_InfCompletaInscripcion" ? (
                renderInfCompletaInscripcion(selectedResult.result)
              ) : selectedResult.status === "success" &&
                selectedResult.endpoint === "Qry_InscripcionNacimiento" ? (
                renderInscripcionNacimiento(selectedResult.result)
              ) : selectedResult.status === "success" &&
                selectedResult.endpoint ===
                  "Qry_InfComplementariaInscripcion" ? (
                renderInfComplementariaInscripcion(selectedResult.result)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  ✅ Consulta ejecutada exitosamente
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResultDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiConsole;
