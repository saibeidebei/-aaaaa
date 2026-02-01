
export interface SubtitleBlock {
  id: number;
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  originalText?: string;
  isCorrected?: boolean;
  correctionReason?: string;
}

export interface CorrectionResult {
  index: number;
  fixedText: string;
  reason: string;
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
