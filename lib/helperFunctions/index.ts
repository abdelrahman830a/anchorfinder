// Compute today's date in YYYYMMDD format.
const currentDate = new Date();
const yyyy = currentDate.getFullYear().toString();
const mm = (currentDate.getMonth() + 1).toString().padStart(2, "0");
const dd = currentDate.getDate().toString().padStart(2, "0");

export const getFormattedDate = (): string => {
    return new Date().toISOString().split("T")[0]; // e.g. "2023-08-15"
};