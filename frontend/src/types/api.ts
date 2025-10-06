export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  parameters?: string[];
}

export interface QueryResult {
  id: string;
  endpoint: string;
  query: string;
  timestamp: string;
  result: {
    success: boolean;
    data?: Record<string, unknown> | Record<string, unknown>[];
    timestamp: string;
    error?: string;
    message?: string;
    consulta?: string;
    parametrosUsados?: Record<string, string>;
    esMock?: boolean;
    motivoMock?: string | null;
  };
  status: "success" | "error";
  userId: string;
}
