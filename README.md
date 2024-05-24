# Filament Ace Editor

[![Latest Version on Packagist](https://img.shields.io/packagist/v/riodwanto/filament-ace-editor.svg?style=flat-square)](https://packagist.org/packages/riodwanto/filament-ace-editor)
[![Total Downloads](https://img.shields.io/packagist/dt/riodwanto/filament-ace-editor.svg?style=flat-square)](https://packagist.org/packages/riodwanto/filament-ace-editor)


Ace Editor implementation for Filament Form.

## Installation

You can install the package via composer:

```bash
composer require riodwanto/filament-ace-editor
```
## Usage

```php
use Riodwanto\FilamentAceEditor\AceEditor;

public function form(Form $form): Form
{
    return $form
        ->schema([
            ...
            AceEditor::make('code-editor')
                ->mode('php')
                ->theme('github')
                ->darkTheme('dracula'),
        ])

}
```

##### Available methods
| Method           | Info                                                                                                        |
| :--------------- | :---------------------------------------------------------------------------------------------------------- |
| mode             | change editor programming language                                                                          |
| theme            | default theme in light mode                                                                                 |
| darkTheme        | default theme in dark mode                                                                                  |
| height           | set editor height                                                                                           |
| disableDarkTheme | disable `darkTheme`, `theme` will be used as default                                                        |
| editorConfig     | editor config will be initialize after `ace` loaded. (it is config that used in `ace.config`)               |
| editorOptions    | editor options used in `ace.editor.options`, you can set additional ace option here.                        |
| addExtensions    | by default, not all options available in `editorOptions`. you must enable extension first with this method. |

All default value can be [see here](#config)

## Publishing

You can publish the views using:

```bash
php artisan vendor:publish --tag="filament-ace-editor-views"
```

You can publish the config file with:

```bash
php artisan vendor:publish --tag="filament-ace-editor-config"
```

###### config
This is the contents of the published config file:

```php
return [
    ...

    // Initilization ace config
    'editor_config' => [
        'useWorker' => false
    ],

    // Editor options
    'editor_options' => [
        'mode' => 'ace/mode/php',
        'theme' => 'ace/theme/eclipse',
        'enableBasicAutocompletion' => true,
        'enableLiveAutocompletion' => true,
        'liveAutocompletionDelay' => 0,
        'liveAutocompletionThreshold' => 0,
        'enableSnippets' => true,
        'enableInlineAutocompletion' => true,
        'showPrintMargin' => false,
        'wrap' => 'free'
    ],

    'dark_mode' => [
        'enable' => true,
        'theme' => 'ace/theme/dracula',
    ],

    'enabled_extensions' => [
        'beautify',
        'language_tools',
        'inline_autocomplete',
    ],
    
    ...
];
```

###### Supported [Ace Features](https://ace.c9.io/#features)
| **Feature**                     |      |
| :------------------------------ | :--- |
| Themes                          | ✅    |
| Automatic indent and outdent    | ✅    |
| Handles huge documents          | ✅    |
| Search and replace              | ✅    |
| Line wrapping                   | ✅    |
| An optional command line        | ❌    |
| Multiple cursors and selections | ✅    |
| Key bindings                    | ❌    |

<a href="https://buymeacoffee.com/riodewanto" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Credits

- [Rio Dewanto P](https://github.com/riodwanto)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
