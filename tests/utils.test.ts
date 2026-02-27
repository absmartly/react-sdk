import { describe, expect, it } from "vitest";
import { convertLetterToNumber } from "../src/utils/convertLetterToNumber";

describe("convertLetterToNumber", () => {
  describe("number passthrough", () => {
    it("should return number as-is when input is a number", () => {
      expect(convertLetterToNumber(0)).toBe(0);
      expect(convertLetterToNumber(1)).toBe(1);
      expect(convertLetterToNumber(5)).toBe(5);
      expect(convertLetterToNumber(99)).toBe(99);
    });
  });

  describe("numeric string conversion", () => {
    it("should convert numeric strings to numbers", () => {
      expect(convertLetterToNumber("0")).toBe(0);
      expect(convertLetterToNumber("1")).toBe(1);
      expect(convertLetterToNumber("5")).toBe(5);
      expect(convertLetterToNumber("9")).toBe(9);
    });
  });

  describe("lowercase letter conversion", () => {
    it("should convert lowercase letters to variant numbers (a=0, b=1, etc.)", () => {
      expect(convertLetterToNumber("a")).toBe(0);
      expect(convertLetterToNumber("b")).toBe(1);
      expect(convertLetterToNumber("c")).toBe(2);
      expect(convertLetterToNumber("d")).toBe(3);
      expect(convertLetterToNumber("e")).toBe(4);
    });

    it("should handle all lowercase letters correctly", () => {
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      for (let i = 0; i < alphabet.length; i++) {
        expect(convertLetterToNumber(alphabet[i] as any)).toBe(i);
      }
    });
  });

  describe("uppercase letter conversion", () => {
    it("should convert uppercase letters to variant numbers (A=0, B=1, etc.)", () => {
      expect(convertLetterToNumber("A")).toBe(0);
      expect(convertLetterToNumber("B")).toBe(1);
      expect(convertLetterToNumber("C")).toBe(2);
      expect(convertLetterToNumber("D")).toBe(3);
      expect(convertLetterToNumber("E")).toBe(4);
    });

    it("should handle all uppercase letters correctly", () => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let i = 0; i < alphabet.length; i++) {
        expect(convertLetterToNumber(alphabet[i] as any)).toBe(i);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle last letters of alphabet", () => {
      expect(convertLetterToNumber("z")).toBe(25);
      expect(convertLetterToNumber("Z")).toBe(25);
    });

    it("should handle treatment variant typical values", () => {
      expect(convertLetterToNumber("A")).toBe(0);
      expect(convertLetterToNumber("B")).toBe(1);
      expect(convertLetterToNumber(0)).toBe(0);
      expect(convertLetterToNumber(1)).toBe(1);
      expect(convertLetterToNumber("0")).toBe(0);
      expect(convertLetterToNumber("1")).toBe(1);
    });
  });
});
