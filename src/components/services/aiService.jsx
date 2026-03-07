/**
 * aiService.js
 * AI(LLM)에게 프롬프트를 보내고 결과를 반환하는 단일 창구.
 * 직접 InvokeLLM을 호출하는 모든 곳은 이 서비스를 통해야 한다.
 */

import { base44 } from "@/api/base44Client";

/**
 * 일반 텍스트 응답
 * @param {string} prompt
 * @param {{ internet?: boolean, fileUrls?: string[] }} options
 * @returns {Promise<string>}
 */
export async function askAI(prompt, { internet = false, fileUrls } = {}) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    ...(fileUrls ? { file_urls: fileUrls } : {}),
  });
  return result;
}

/**
 * 구조화된 JSON 응답
 * @param {string}  prompt
 * @param {object}  jsonSchema  - response_json_schema (root는 반드시 type:"object")
 * @param {{ internet?: boolean, fileUrls?: string[] }} options
 * @returns {Promise<object>}
 */
export async function askAIJson(prompt, jsonSchema, { internet = false, fileUrls } = {}) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: jsonSchema,
    add_context_from_internet: internet,
    ...(fileUrls ? { file_urls: fileUrls } : {}),
  });
  return result;
}