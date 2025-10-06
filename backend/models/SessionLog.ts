import mongoose from "mongoose";

export interface ISessionLog extends mongoose.Document {
  userId: string;
  userEmail: string;
  userName: string;
  sessionId: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress?: string;
  userAgent?: string;
  activities: IActivity[];
  totalQueries: number;
  totalDownloads: number;
  totalPrints: number;
  sessionDuration?: number; // en minutos
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivity {
  type:
    | "LOGIN"
    | "LOGOUT"
    | "QUERY"
    | "DOWNLOAD"
    | "PRINT"
    | "VIEW_RESULT"
    | "EXPORT_DATA";
  timestamp: Date;
  details: {
    endpoint?: string;
    queryParams?: Record<string, any>;
    success?: boolean;
    error?: string;
    responseSize?: number;
    downloadFormat?: string;
    fileName?: string;
    resultId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

const ActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "LOGIN",
      "LOGOUT",
      "QUERY",
      "DOWNLOAD",
      "PRINT",
      "VIEW_RESULT",
      "EXPORT_DATA",
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  details: {
    endpoint: String,
    queryParams: mongoose.Schema.Types.Mixed,
    success: Boolean,
    error: String,
    responseSize: Number,
    downloadFormat: String,
    fileName: String,
    resultId: String,
    ipAddress: String,
    userAgent: String,
  },
});

const SessionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    logoutTime: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    activities: [ActivitySchema],
    totalQueries: {
      type: Number,
      default: 0,
    },
    totalDownloads: {
      type: Number,
      default: 0,
    },
    totalPrints: {
      type: Number,
      default: 0,
    },
    sessionDuration: {
      type: Number, // en minutos
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para optimizar consultas
SessionLogSchema.index({ userId: 1, loginTime: -1 });
SessionLogSchema.index({ sessionId: 1 });
SessionLogSchema.index({ loginTime: -1 });
SessionLogSchema.index({ isActive: 1 });

export default mongoose.model<ISessionLog>("SessionLog", SessionLogSchema);
