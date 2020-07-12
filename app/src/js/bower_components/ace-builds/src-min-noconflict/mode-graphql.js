ace.define('ace/mode/graphql_highlight_rules', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], (acequire, exports) => {

  const oop = acequire('ace/lib/oop');
  const TextHighlightRules = acequire('ace/mode/text_highlight_rules').TextHighlightRules;

  const GraphQLHighlightRules = function () {

    this.$rules = {
      'start': [
      {
        include: '#comment' },

      {
        include: '#comment-multiline' },

      {
        include: '#type-declaration' },

      {
        include: '#union-declaration' },

      {
        include: '#scalar-declaration' },

      {
        include: '#enum-declaration' },

      {
        include: '#operation' },

      {
        include: '#fragment' },

      {
        include: '#selection-set' },

      {
        include: '#variable-declarations' },

      {
        include: '#type-condition' }],

      '#comment': [
      {
        token: 'comment.line.number-sign',
        regex: /#.*$/ }],

      '#comment-multiline': [{
        token: 'comment.block.documentation',
        regex: /"""/,
        push: [{
          token: 'comment.block.documentation',
          regex: /"""/,
          next: 'pop' },
        {
          defaultToken: 'comment.block.documentation' }] }],


      '#null': [
      {
        token: 'constant.language.null',
        regex: /null/ }],

      '#boolean': [
      {
        token: 'constant.language.boolean',
        regex: /true|false/ }],

      '#operation': [
      {
        token: [
        'keyword.operator',
        'meta.operation',
        'entity.name.function'],

        regex: /(query|mutation|subscription)(\s*)([_A-Za-z][_0-9A-Za-z]*)?/ }],

      '#number': [
      {
        token: 'constant.numeric',
        regex: /(\-?)(\d+\.?\d*[eE]?[\+\-]?\d*)/ }],

      '#fragment': [
      {
        token: [
        'keyword.operator',
        'meta.fragment',
        'entity.name.type'],

        regex: /(fragment)(\s*)([_A-Za-z][_0-9A-Za-z]*)?/ }],

      '#fragment-spread': [
      {
        token: [
        'keyword.operator',
        'meta.fragment-spread',
        'entity.name.type'],

        regex: /(\.\.\.)(\s*)(?!on)((?:[_A-Za-z][_0-9A-Za-z]+)?)?/ }],

      '#string': [
      {
        token: 'string.quoted.double',
        regex: /"/,
        push: [
        {
          token: 'string.quoted.double',
          regex: /"/,
          next: 'pop' },

        {
          include: '#escapedCharacter' },

        {
          defaultToken: 'string.quoted.double' }] }],


      '#escapedCharacter': [
      {
        token: 'constant.character.escape',
        regex: /\\(?:u[0-9A-Fa-f]{4}|["\\\/bfnrt])/ }],

      '#enum': [
      {
        token: 'support.constant.enum',
        regex: /[_A-Za-z][_0-9A-Za-z]*/ }],

      '#directive': [
      {
        token: [
        'entity.name.function',
        'meta.directive',
        'entity.name.function'],

        regex: /(@)(\s*)([_A-Za-z][_0-9A-Za-z]*)?/ }],

      '#enum-declaration': [
      {
        token: [
        'keyword.operator',
        'meta.enum-declaration',
        'entity.name.type',
        'meta.enum-declaration'],

        regex: /(enum)(\s+)([_A-Za-z][_0-9A-Za-z]+)?(\s+\{)?/,
        push: [
        {
          token: 'meta.enum-declaration',
          regex: /\}/,
          next: 'pop' },

        {
          include: '#comment' },

        {
          include: '#comment-multiline' },

        {
          include: '#enum' },

        {
          defaultToken: 'meta.enum-declaration' }] }],


      '#scalar-declaration': [
      {
        token: [
        'keyword.operator',
        'meta.scalar-declaration',
        'entity.name.type'],

        regex: /(scalar)(\s+)([_A-Za-z][_0-9A-Za-z]+)?/ }],

      '#union-declaration': [{
        token: [
        'keyword.operator',
        'meta.union-declaration',
        'entity.name.type',
        'meta.union-declaration',
        'keyword.operator'],

        regex: /(union)(\s+)([_A-Za-z][_0-9A-Za-z]*)?(\s+)?(\=)?/,
        push: [
        {
          token: 'meta.union-declaration',
          regex: /$/,
          next: 'pop' },

        {
          token: 'keyword.operator',
          regex: /\|/ },

        {
          token: 'entity.name.type',
          regex: /([_A-Za-z][_0-9A-Za-z]*)/ },

        {
          defaultToken: 'meta.union-declaration' }] }],



      '#type-declaration': [
      {
        token: [
        'keyword.operator',
        'meta.type-declaration',
        'entity.name.function',
        'meta.type-declaration',
        'storage.type',
        'meta.type-declaration',
        'entity.other.inherited-class',
        'meta.type-declaration'],

        regex: /(input|type|interface)(\s+)([_A-Za-z][_0-9A-Za-z]+)?(\s+)?(?:(@)(\s*)([_A-Za-z][_0-9A-Za-z]*))?(\s*\{)?/,
        push: [
        {
          token: 'meta.type-declaration',
          regex: /\}/,
          next: 'pop' },

        {
          token: 'keyword.operator',
          regex: /(implements|\&)/ },

        {
          include: '#comment' },

        {
          include: '#comment-multiline' },

        {
          include: '#directive' },

        {
          include: '#arguments' },

        {
          include: '#type-field' },

        {
          include: '#variable-type' },

        {
          include: '#variable-array' },

        {
          include: '#variable-bang' },

        {
          defaultToken: 'meta.type-declaration' }] }],


      '#type-field': [
      {
        token: 'entity.name.type',
        regex: /([_A-Za-z][_0-9A-Za-z]*)(?=\s*(:|\())/ }],

      '#type-condition': [
      {
        token: [
        'meta.type-condition',
        'keyword.operator',
        'meta.type-condition',
        'entity.name.type'],

        regex: /(\s+)(on)(\s+)([_A-Za-z][_0-9A-Za-z]*)?/ }],

      '#variable-declarations': [
      {
        token: 'meta.variable-declarations',
        regex: /\(/,
        push: [
        {
          token: 'meta.variable-declarations',
          regex: /\)/,
          next: 'pop' },

        {
          include: '#variable-declaration' },

        {
          include: '#variable-type' },

        {
          include: '#variable-array' },

        {
          include: '#variable-bang' },

        {
          include: '#variable-default' },

        {
          include: '#value' },

        {
          include: '#comment' },

        {
          include: '#comment-multiline' },

        {
          defaultToken: 'meta.variable-declarations' }] }],


      '#variable-declaration': [
      {
        token: 'variable.parameter',
        regex: /(\$[_A-Za-z][_0-9A-Za-z]*)(\s*:)/ }],

      '#variable-name': [
      {
        token: 'variable.parameter',
        regex: /\$[_A-Za-z][_0-9A-Za-z]*/ }],

      '#variable-type': [
      {
        token: 'storage.type.variable',
        regex: /[_A-Za-z][_0-9A-Za-z]*/ }],

      '#variable-array': [
      {
        token: 'meta.variable-array',
        regex: /\[/,
        push: [
        {
          token: 'meta.variable-array',
          regex: /\]/,
          next: 'pop' },

        {
          include: '#variable-type' },

        {
          include: '#variable-bang' },

        {
          defaultToken: 'meta.variable-array' }] }],


      '#variable-bang': [
      {
        token: 'keyword.operator',
        regex: /\!/ }],

      '#variable-default': [
      {
        token: 'keyword.operator',
        regex: /=/ }],

      '#selection-set': [
      {
        token: 'meta.selection-set',
        regex: /\{/,
        push: [
        {
          token: 'meta.selection-set',
          regex: /\}/,
          next: 'pop' },

        {
          include: '#comment' },

        {
          include: '#comment-multiline' },

        {
          include: '#selection-set' },

        {
          include: '#fragment-spread' },

        {
          include: '#type-condition' },

        {
          include: '#directive' },

        {
          include: '#arguments' },

        {
          include: '#alias' },

        {
          defaultToken: 'entity.name.type' }] }],


      '#arguments': [
      {
        token: 'meta.arguments',
        regex: /\(/,
        push: [
        {
          token: 'meta.arguments',
          regex: /\)/,
          next: 'pop' },

        {
          include: '#comment' },

        {
          include: '#comment-multiline' },

        {
          include: '#value' },

        {
          defaultToken: 'meta.arguments' }] }],


      '#value': [
      {
        include: '#variable-name' },

      {
        include: '#argument' },

      {
        include: '#string' },

      {
        include: '#number' },

      {
        include: '#boolean' },

      {
        include: '#null' },

      {
        include: '#enum' }],

      '#argument': [
      {
        token: 'variable.other',
        regex: /([_A-Za-z][_0-9A-Za-z]*)(\s*:)/ }],

      '#alias': [
      {
        token: 'entity.section',
        regex: /([_A-Za-z][_0-9A-Za-z]*)(\s*:)/ }] };



    this.normalizeRules();
  };

  oop.inherits(GraphQLHighlightRules, TextHighlightRules);

  exports.GraphQLHighlightRules = GraphQLHighlightRules;

});

ace.define('ace/mode/graphql_base', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/graphql_highlight_rules', 'ace/worker/worker_client'], (acequire, exports) => {
  const oop = acequire('ace/lib/oop');
  const TextMode = acequire('ace/mode/text').Mode;
  const { GraphQLHighlightRules } = acequire('ace/mode/graphql_highlight_rules');
  const { MatchingBraceOutdent } = acequire('ace/mode/matching_brace_outdent');

  var Mode = function () {
    this.HighlightRules = GraphQLHighlightRules;
    this.$behaviour = this.$defaultBehaviour;
    this.$outdent = new MatchingBraceOutdent();
  };

  oop.inherits(Mode, TextMode);

  (function () {

    /**
                 * Get indentation of the next line.
                 *
                 * @param {*} state - Ace Editor State.
                 * @param {String} line - The content of the current line.
                 * @param {String} tab - Give tab string (spaces when using softTabs)
                 *
                 * @returns {String} - Indent of the next line.
                 */
    this.getNextLineIndent = function (state, line, tab) {
      var indent = this.$getIndent(line),
      trimmedLine = line.trim();

      // If the trimmed line ends with open brackets, add one indentation;
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('(') || trimmedLine.endsWith('[')) {
        indent += tab;
      }

      return indent;
    };

    this.checkOutdent = function (state, line, input) {
      return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function (state, doc, row) {
      this.$outdent.autoOutdent(doc, row);
    };

    this.lineCommentStart = '#';

  }).call(Mode.prototype);

  exports.Mode = Mode;
});

ace.define('ace/mode/graphql', ['require', 'exports', 'ace/lib/oop', 'ace/mode/graphql_base'], (acequire, exports) => {
  const oop = acequire('ace/lib/oop');
  const GraphQLBase = acequire('ace/mode/graphql_base').Mode;

  var Mode = function () {
    GraphQLBase.call(this);
  };

  oop.inherits(Mode, GraphQLBase);

  (function () {
    this.$id = 'ace/mode/graphql';
  }).call(Mode.prototype);

  exports.Mode = Mode;
});


