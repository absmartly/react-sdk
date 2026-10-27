import { Char } from "../types";

export const convertLetterToNumber = (char: Char | number): number => {
  if (typeof char === "number") return char;

  if (/^[+-]?\d+$/.test(char)) {
    return parseInt(char, 10);
  }

  if (typeof char === "string" && char.length === 1) {
    const lowerChar = char.toLowerCase();
    if (lowerChar >= "a" && lowerChar <= "z") {
      return lowerChar.charCodeAt(0) - 97;
    }
  }

  console.warn(`convertLetterToNumber: Invalid input "${char}". Returning 0.`);
  return 0;
};
