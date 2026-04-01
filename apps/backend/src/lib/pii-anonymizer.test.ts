import { PiiAnonymizer } from "@/lib/pii-anonymizer";
import { describe, expect, it } from "vitest";

describe("PiiAnonymizer", () => {
  describe("anonymizeIpAddress", () => {
    it("should anonymize IPv4 addresses by masking last octet", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("192.168.1.100")).toBe("192.168.1.xxx");
      expect(PiiAnonymizer.anonymizeIpAddress("10.0.0.1")).toBe("10.0.0.xxx");
      expect(PiiAnonymizer.anonymizeIpAddress("172.16.254.255")).toBe("172.16.254.xxx");
    });

    it("should anonymize IPv6 addresses by masking last 64 bits", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        "2001:0db8:85a3:0000:xxxx:xxxx:xxxx:xxxx",
      );

      expect(PiiAnonymizer.anonymizeIpAddress("fe80:0000:0000:0000:0204:61ff:fe9d:f156")).toBe(
        "fe80:0000:0000:0000:xxxx:xxxx:xxxx:xxxx",
      );
    });

    it("should handle compressed IPv6 notation", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("2001:db8::1")).toBe("2001:db8::xxxx:xxxx:xxxx:xxxx");

      expect(PiiAnonymizer.anonymizeIpAddress("fe80::1")).toBe("fe80::xxxx:xxxx:xxxx:xxxx");

      expect(PiiAnonymizer.anonymizeIpAddress("::1")).toBe("xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx");
    });

    it("should handle multi-segment compressed IPv6 notation", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("2001:db8:85a3:0000::1")).toBe("2001:db8:85a3:0000::xxxx:xxxx:xxxx:xxxx");
    });

    it("should return 'unknown' unchanged", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("unknown")).toBe("unknown");
    });

    it("should handle empty or invalid IP addresses", () => {
      expect(PiiAnonymizer.anonymizeIpAddress("")).toBe("");
      expect(PiiAnonymizer.anonymizeIpAddress("not-an-ip")).toBe("xxx.xxx.xxx.xxx");
      expect(PiiAnonymizer.anonymizeIpAddress("192.168.1")).toBe("xxx.xxx.xxx.xxx");
    });
  });

  describe("sanitizeErrorStack", () => {
    it("should return null for null input", () => {
      expect(PiiAnonymizer.sanitizeErrorStack(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(PiiAnonymizer.sanitizeErrorStack(undefined)).toBeNull();
    });

    it("should return empty string for empty input", () => {
      expect(PiiAnonymizer.sanitizeErrorStack("")).toBe("");
    });

    it("should truncate file paths deeper than 3 levels", () => {
      const stack = "Error: foo\n  at bar (/app/src/lib/utils/foo.ts:10:5)";
      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toContain("/.../");
      expect(result).toContain("utils/foo.ts:10:5");
      expect(result).not.toContain("/app/src/lib/utils/foo.ts");
    });

    it("should preserve paths with 3 or fewer segments", () => {
      const stack = "Error: foo\n  at bar (/app/foo.ts:10:5)";
      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toBe(stack);
      expect(result).not.toContain("...");
    });

    it("should handle stack traces without file paths", () => {
      const stack = "Error: Something went wrong\n  at <anonymous>";
      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toBe(stack);
    });

    it("should handle native code references", () => {
      const stack = "Error: foo\n  at bar (native)";
      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toBe(stack);
    });

    it("should handle multiple stack trace lines", () => {
      const stack = `Error: Test error
  at foo (/app/src/lib/utils/foo.ts:10:5)
  at bar (/app/src/lib/utils/bar.ts:20:10)
  at baz (/simple.ts:5:1)`;

      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toContain("/.../..."); // Multiple truncations
      expect(result).toContain("/simple.ts:5:1"); // Short path preserved
    });

    it("should preserve error message line", () => {
      const stack = "Error: Something went wrong\n  at foo (/app/src/lib/utils/foo.ts:10:5)";
      const result = PiiAnonymizer.sanitizeErrorStack(stack);

      expect(result).toContain("Error: Something went wrong");
    });
  });

  describe("truncateUserAgent", () => {
    it("should return null for null input", () => {
      expect(PiiAnonymizer.truncateUserAgent(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(PiiAnonymizer.truncateUserAgent(undefined)).toBeNull();
    });

    it("should return empty string for empty input", () => {
      expect(PiiAnonymizer.truncateUserAgent("")).toBe("");
    });

    it("should not truncate user agents shorter than 100 characters", () => {
      const shortUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      expect(PiiAnonymizer.truncateUserAgent(shortUA)).toBe(shortUA);
    });

    it("should not truncate user agents exactly 100 characters", () => {
      const exactUA = "a".repeat(100);
      expect(PiiAnonymizer.truncateUserAgent(exactUA)).toBe(exactUA);
      expect(PiiAnonymizer.truncateUserAgent(exactUA)).toHaveLength(100);
    });

    it("should truncate user agents longer than 100 characters", () => {
      const longUA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 and lots more text here that goes beyond 100 characters";
      const result = PiiAnonymizer.truncateUserAgent(longUA);

      expect(result).toContain("[truncated]");
      expect(result).toHaveLength(112); // 100 chars + " [truncated]" (12 chars)
      expect(result).toBe(`${longUA.slice(0, 100)} [truncated]`);
    });

    it("should truncate at exactly 100 characters before adding suffix", () => {
      const longUA = "a".repeat(150);
      const result = PiiAnonymizer.truncateUserAgent(longUA);

      expect(result).toBe(`${"a".repeat(100)} [truncated]`);
      expect(result).toHaveLength(112);
    });
  });
});
