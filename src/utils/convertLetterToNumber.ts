import { Char } from "../types";

export const convertLetterToNumber = (char: Char | number): number => {
  if (typeof char === "number") return char;

  const parsed = parseInt(char, 10);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  if (typeof char === "string" && char.length === 1) {
    const lowerChar = char.toLowerCase();
    if (lowerChar >= 'a' && lowerChar <= 'z') {
      return lowerChar.charCodeAt(0) - 97;
    }
  }

  console.warn(
    `convertLetterToNumber: Invalid input "${char}". Returning 0.`
  );
  return 0;
};
