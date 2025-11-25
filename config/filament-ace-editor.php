<?php


return [
    /**
     * Base URL for loading ACE editor files
     * You can change this to a self-hosted URL if needed
     */
    'base_url' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3',

    /**
     * Main ACE editor file to load from the CDN
     * Usually 'ace.js' unless a custom build
     */
    'file' => 'ace.js',

    /**
     * Global ACE editor configuration settings
     * These settings affect all ACE editor instances
     */
    'editor_config' => [
        'useWorker' => false
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Editor Options
    |--------------------------------------------------------------------------
    |
    | These are the default options applied to all AceEditor instances.
    | You can override these per field using the editorOptions() method.
    |
    */
    'editor_options' => [
        'mode' => 'ace/mode/php',
        'theme' => 'ace/theme/eclipse',
        'enableBasicAutocompletion' => true,
        'enableLiveAutocompletion' => true,
        'liveAutocompletionDelay' => 0,
        'liveAutocompletionThreshold' => 0,
        'enableSnippets' => true,
        'enableInlineAutocompletion' => true,
        'showPrintMargin' => true,
        'wrap' => 'off',
        // Performance optimizations
        'animatedScroll' => false,
        'fadeFoldWidgets' => false,
        'displayIndentGuides' => false,
        'highlightGutterLine' => false,
        'showInvisibles' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Dark Mode Configuration
    |--------------------------------------------------------------------------
    |
    | Controls how the editor behaves when Filament is in dark mode.
    |
    */
    'dark_mode' => [
        'enable' => true,
        'theme' => 'ace/theme/dracula',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Extensions
    |--------------------------------------------------------------------------
    |
    | Extensions that should be loaded by default. Add extension keys
    | from the 'extensions' array below.
    |
    */
    'enabled_extensions' => [
        'beautify',
        'language_tools',
        'inline_autocomplete',
        'rtl',
        'statusbar',
        'whitespace',
        'searchbox',
    ],

    /*
    |--------------------------------------------------------------------------
    | Overscroll Configuration
    |--------------------------------------------------------------------------
    |
    | These settings affect the scroll behavior and overscroll effects.
    |
    */
    'overscroll' => [
        'enabled' => false,
        'size' => 16,
        'behavior' => 'manual',
        'horizontal' => true,
        'vertical' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Available Extensions
    |--------------------------------------------------------------------------
    |
    | Available ACE editor extensions and their CDN URLs.
    | Add custom extensions here as needed.
    |
    */
    'extensions' => [
        'beautify' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-beautify.min.js',
        'code_lens' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-code_lens.min.js',
        'command_bar' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-command_bar.min.js',
        'elastic_tabstops_lite' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-elastic_tabstops_lite.min.js',
        'emmet' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-emmet.min.js',
        'error_marker' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-error_marker.min.js',
        'hardwrap' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-hardwrap.min.js',
        'inline_autocomplete' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-inline_autocomplete.min.js',
        'keybinding_menu' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-keybinding_menu.min.js',
        'language_tools' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-language_tools.min.js',
        'linking' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-linking.min.js',
        'modelist' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-modelist.min.js',
        'options' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-options.min.js',
        'prompt' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-prompt.min.js',
        'rtl' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-rtl.min.js',
        'searchbox' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-searchbox.min.js',
        'settings_menu' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-settings_menu.min.js',
        'simple_tokenizer' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-simple_tokenizer.min.js',
        'spellcheck' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-spellcheck.min.js',
        'split' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-split.min.js',
        'static_highlight' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-static_highlight.min.js',
        'statusbar' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-statusbar.min.js',
        'textarea' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-textarea.min.js',
        'themelist' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-themelist.min.js',
        'whitespace' => 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ext-whitespace.min.js',
    ],
];
