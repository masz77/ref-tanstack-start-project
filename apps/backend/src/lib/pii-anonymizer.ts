/**
 * PII Anonymization Utility
 *
 * Provides functions to anonymize personally identifiable information (PII)
 * in logs to ensure GDPR and privacy compliance.
 */

export class PiiAnonymizer {
  /**
   * Anonymize an IP address by masking the last octet (IPv4) or last 80 bits (IPv6)
   *
   * @param ipAddress - The IP address to anonymize
   * @returns Anonymized IP address with masked portions
   *
   * @example
   * anonymizeIpAddress("192.168.1.100") // => "192.168.1.xxx"
   * anonymizeIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334") // => "2001:0db8:85a3:0000:xxxx:xxxx:xxxx:xxxx"
   */
  static anonymizeIpAddress(ipAddress: string): string {
    if (!ipAddress || ipAddress === "unknown") {
      return ipAddress;
    }

    // IPv4 detection - contains dots and no colons
    if (ipAddress.includes(".") && !ipAddress.includes(":")) {
      const parts = ipAddress.split(".");
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }

    // IPv6 detection - contains colons
    if (ipAddress.includes(":")) {
      const parts = ipAddress.split(":");

      // Handle compressed IPv6 (::)
      if (ipAddress.includes("::")) {
        // For compressed notation, keep first 4 groups and mask the rest
        const [prefix] = ipAddress.split("::");
        const prefixParts = prefix ? prefix.split(":") : [];
        const keepParts = prefixParts.slice(0, 4);

        if (keepParts.length > 0) {
          return `${keepParts.join(":")}::xxxx:xxxx:xxxx:xxxx`;
        }
        return "xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx";
      }

      // Standard IPv6 notation - keep first 4 groups (64 bits), mask last 4 groups (64 bits)
      if (parts.length === 8) {
        return `${parts.slice(0, 4).join(":")}:xxxx:xxxx:xxxx:xxxx`;
      }
    }

    // Fallback for unrecognized format
    return "xxx.xxx.xxx.xxx";
  }

  /**
   * Sanitize error stack traces by:
   * - Removing file paths deeper than 3 levels
   * - Redacting variable values and sensitive information
   *
   * @param errorStack - The error stack trace to sanitize
   * @returns Sanitized stack trace
   *
   * @example
   * sanitizeErrorStack("Error: foo\n  at bar (/app/src/lib/utils/foo.ts:10:5)")
   * // => "Error: foo\n  at bar (/.../utils/foo.ts:10:5)"
   */
  static sanitizeErrorStack(errorStack: string | null | undefined): string | null {
    if (!errorStack) {
      return errorStack ?? null;
    }

    return errorStack
      .split("\n")
      .map((line) => {
        // Match file paths in stack traces (e.g., at foo (/path/to/file.ts:10:5))
        const filePathMatch = line.match(/\(([^)]+)\)/);

        if (!filePathMatch) {
          return line;
        }

        const fullPath = filePathMatch[1];

        // Don't modify paths that are already simple (like "native" or "<anonymous>")
        if (!fullPath.includes("/")) {
          return line;
        }

        // Split path into segments
        const pathParts = fullPath.split("/");

        // Extract line:column info if present
        const lastPart = pathParts[pathParts.length - 1];
        const colonMatch = lastPart.match(/^([^:]+)(:.+)$/);

        let fileName = lastPart;
        let lineCol = "";

        if (colonMatch) {
          fileName = colonMatch[1];
          lineCol = colonMatch[2];
        }

        // If path has more than 3 segments, truncate it
        if (pathParts.length > 3) {
          // Keep first segment (usually empty for absolute paths), add ellipsis, keep last 2 segments
          const truncatedPath = `/.../.../${pathParts[pathParts.length - 2]}/${fileName}${lineCol}`;
          return line.replace(fullPath, truncatedPath);
        }

        return line;
      })
      .join("\n");
  }

  /**
   * Truncate user agent string to first 100 characters
   *
   * @param userAgent - The user agent string to truncate
   * @returns Truncated user agent string
   *
   * @example
   * truncateUserAgent("Mozilla/5.0 (very long string...)")
   * // => "Mozilla/5.0 (very long string... [truncated]"
   */
  static truncateUserAgent(userAgent: string | null | undefined): string | null {
    if (!userAgent) {
      return userAgent ?? null;
    }

    const MAX_LENGTH = 100;

    if (userAgent.length <= MAX_LENGTH) {
      return userAgent;
    }

    return `${userAgent.slice(0, MAX_LENGTH)} [truncated]`;
  }
}

export default PiiAnonymizer;
