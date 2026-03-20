// KST 기준 오늘 날짜 반환 (YYYY-MM-DD)
export const getKSTDateString = () => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
    return kst.toISOString().split("T")[0];
};