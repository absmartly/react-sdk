import type { Char } from "../types";

export const convertLetterToNumber = (char: Char | number) => {
  if (typeof char === "number") return char;
  if (Number.isNaN(parseInt(char)))
    return char.toLowerCase().charCodeAt(0) - 97;
  return parseInt(char);
};
