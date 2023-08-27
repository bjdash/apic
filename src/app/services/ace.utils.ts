export class AceUtils {
  static SUPPORTED_MODES = ['json', 'yaml', 'xml', 'javascript', 'graphql', 'html'];
  static getModeFromContentType(cType: string): string {
    let groups = cType?.match(/.*\/([\w\-\+]+)/);
    return groups[1]?.toLowerCase() ?? 'text';
  }
}