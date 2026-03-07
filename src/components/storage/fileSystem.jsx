/**
 * fileSystem.js
 * LocalStorage를 "파일 시스템"처럼 다루는 핵심 유틸리티.
 * key 네임스페이스를 관리하고 JSON 직렬화/역직렬화를 자동 처리한다.
 */

const NS = "hada::";

export const fileSystem = {
  /**
   * 파일 쓰기 (저장)
   * @param {string} path  - 가상 경로 (예: "destinyChart/user123")
   * @param {any}    data  - 저장할 데이터 (자동으로 JSON 직렬화)
   */
  write(path, data) {
    localStorage.setItem(NS + path, JSON.stringify({ data, updatedAt: Date.now() }));
  },

  /**
   * 파일 읽기 (불러오기)
   * @param {string} path
   * @returns {any|null} 저장된 데이터, 없으면 null
   */
  read(path) {
    const raw = localStorage.getItem(NS + path);
    if (!raw) return null;
    try {
      return JSON.parse(raw).data;
    } catch {
      return null;
    }
  },

  /**
   * 파일 존재 여부 확인
   * @param {string} path
   * @returns {boolean}
   */
  exists(path) {
    return localStorage.getItem(NS + path) !== null;
  },

  /**
   * 파일 메타데이터 (업데이트 시각 등)
   * @param {string} path
   * @returns {{ updatedAt: number }|null}
   */
  stat(path) {
    const raw = localStorage.getItem(NS + path);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { updatedAt: parsed.updatedAt };
    } catch {
      return null;
    }
  },

  /**
   * 파일 삭제
   * @param {string} path
   */
  remove(path) {
    localStorage.removeItem(NS + path);
  },

  /**
   * 특정 디렉터리(prefix) 아래 모든 파일 경로 목록 반환
   * @param {string} dir - 예: "dailyLog/"
   * @returns {string[]} path 목록 (NS prefix 제거 후)
   */
  listDir(dir) {
    const prefix = NS + dir;
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(NS.length));
  },

  /**
   * 전체 네임스페이스 초기화 (앱 데이터 전부 삭제)
   */
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(NS))
      .forEach(k => localStorage.removeItem(k));
  },
};