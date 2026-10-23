export class SessionRequestGuard {
  private activeToken: string | null = null;

  activate(token: string) {
    this.activeToken = token;
  }

  clear() {
    this.activeToken = null;
  }

  isCurrent(token: string) {
    return this.activeToken === token;
  }

  hasActiveSession() {
    return this.activeToken !== null;
  }
}
