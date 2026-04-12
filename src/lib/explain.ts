import type { DiagnosisResult } from './types'

function formatProblemTarget(problem: DiagnosisResult['problems'][number]): string {
  const label = problem.type === 'drift' ? '목표' : '기준선'
  return `${label} ${problem.target}%`
}

function summarizeProblems(diagnosis: DiagnosisResult): string {
  return diagnosis.problems
    .map(problem => `- ${problem.label}: 현재 ${problem.current}%, ${formatProblemTarget(problem)}`)
    .join('\n')
}

function summarizeActions(diagnosis: DiagnosisResult): string {
  return diagnosis.actions
    .map(action => (
      `- ${action.name} ${action.action === 'sell' ? '매도' : '매수'} `
      + `${action.quantity}주 (약 ${action.estimatedAmount.toLocaleString()}원)`
    ))
    .join('\n')
}

export function buildExplanationPrompt(diagnosis: DiagnosisResult): string {
  return `다음은 포트폴리오 진단 결과입니다.

문제:
${summarizeProblems(diagnosis)}

권장 조치:
${summarizeActions(diagnosis)}

이 진단 결과를 한국어로 3문장 이내로 설명해줘.
규칙:
- 숫자를 반드시 사용할 것
- 금융 전문용어 사용하지 말 것 (예: "드리프트", "변동성" 대신 쉬운 표현)
- "~할 수 있습니다" 금지, 직접적으로 설명
- 마지막 문장은 "실행 여부와 시점은 본인이 결정하세요."로 끝낼 것`
}
