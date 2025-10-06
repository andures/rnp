import { type ActivityLog } from "../types/user";

export class ActivityLogger {
  private static getStoredLogs(): ActivityLog[] {
    return JSON.parse(localStorage.getItem("activityLogs") || "[]");
  }

  private static saveLogs(logs: ActivityLog[]): void {
    localStorage.setItem("activityLogs", JSON.stringify(logs));
  }

  static log(
    userId: string,
    username: string,
    action: string,
    details: string,
    ipAddress: string = "127.0.0.1",
    userAgent: string = navigator.userAgent
  ): void {
    const logs = this.getStoredLogs();
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      userId,
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
    };

    logs.push(newLog);
    this.saveLogs(logs);
  }

  static getUserLogs(userId: string): ActivityLog[] {
    const logs = this.getStoredLogs();
    return logs
      .filter((log) => log.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  static getAllLogs(): ActivityLog[] {
    const logs = this.getStoredLogs();
    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static clearUserLogs(userId: string): void {
    const logs = this.getStoredLogs();
    const filteredLogs = logs.filter((log) => log.userId !== userId);
    this.saveLogs(filteredLogs);
  }
}
