export interface HistoryEntry {
  key: string
  time: number
}

export interface TOTPState {
  secret: string
  code: string
  secondsLeft: number
  isValid: boolean
  error: string
}
