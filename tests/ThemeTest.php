<?php

use Riodwanto\FilamentAceEditor\Enums\Theme;
use Riodwanto\FilamentAceEditor\AceEditor;

it('Theme enum has correct number of themes', function () {
    expect(Theme::cases())->toHaveCount(9);
});

it('Theme enum provides proper labels', function () {
    expect(Theme::GitHub->getLabel())->toBe('GitHub');
    expect(Theme::Monokai->getLabel())->toBe('Monokai');
    expect(Theme::Dracula->getLabel())->toBe('Dracula');
    expect(Theme::OneDark->getLabel())->toBe('One Dark');
    expect(Theme::NordDark->getLabel())->toBe('Nord Dark');
    expect(Theme::SolarizedLight->getLabel())->toBe('Solarized Light');
    expect(Theme::SolarizedDark->getLabel())->toBe('Solarized Dark');
    expect(Theme::Eclipse->getLabel())->toBe('Eclipse');
    expect(Theme::TextMate->getLabel())->toBe('TextMate');
});

it('Theme enum provides ACE theme paths', function () {
    expect(Theme::GitHub->getAceTheme())->toBe('ace/theme/github');
    expect(Theme::Monokai->getAceTheme())->toBe('ace/theme/monokai');
    expect(Theme::Dracula->getAceTheme())->toBe('ace/theme/dracula');
    expect(Theme::OneDark->getAceTheme())->toBe('ace/theme/one_dark');
});

it('Theme enum correctly identifies light and dark themes', function () {
    // Light themes
    expect(Theme::GitHub->isLight())->toBeTrue();
    expect(Theme::GitHub->isDark())->toBeFalse();
    expect(Theme::SolarizedLight->isLight())->toBeTrue();
    expect(Theme::TextMate->isLight())->toBeTrue();
    expect(Theme::Eclipse->isLight())->toBeTrue();

    // Dark themes
    expect(Theme::Monokai->isDark())->toBeTrue();
    expect(Theme::Monokai->isLight())->toBeFalse();
    expect(Theme::Dracula->isDark())->toBeTrue();
    expect(Theme::OneDark->isDark())->toBeTrue();
    expect(Theme::NordDark->isDark())->toBeTrue();
    expect(Theme::SolarizedDark->isDark())->toBeTrue();
});

it('Theme enum toArray provides proper options array', function () {
    $themes = Theme::toArray();

    expect($themes)->toBeArray();
    expect($themes)->toHaveCount(9);
    expect($themes)->toHaveKey('github');
    expect($themes)->toHaveKey('monokai');
    expect($themes)->toHaveKey('dracula');
    expect($themes['github'])->toBe('GitHub');
    expect($themes['monokai'])->toBe('Monokai');
});

it('Theme enum getLightThemes returns only light themes', function () {
    $lightThemes = Theme::getLightThemes();

    expect($lightThemes)->toBeArray();
    expect($lightThemes)->toHaveCount(4);
    expect($lightThemes)->toHaveKey('github');
    expect($lightThemes)->toHaveKey('solarized_light');
    expect($lightThemes)->toHaveKey('textmate');
    expect($lightThemes)->toHaveKey('eclipse');
    expect($lightThemes)->not->toHaveKey('monokai');
    expect($lightThemes)->not->toHaveKey('dracula');
});

it('Theme enum getDarkThemes returns only dark themes', function () {
    $darkThemes = Theme::getDarkThemes();

    expect($darkThemes)->toBeArray();
    expect($darkThemes)->toHaveCount(5);
    expect($darkThemes)->toHaveKey('monokai');
    expect($darkThemes)->toHaveKey('dracula');
    expect($darkThemes)->toHaveKey('one_dark');
    expect($darkThemes)->toHaveKey('nord_dark');
    expect($darkThemes)->toHaveKey('solarized_dark');
    expect($darkThemes)->not->toHaveKey('github');
    expect($darkThemes)->not->toHaveKey('textmate');
});

it('Theme enum getByCategory provides categorized themes', function () {
    $categories = Theme::getByCategory();

    expect($categories)->toBeArray();
    expect($categories)->toHaveKey('Light Themes');
    expect($categories)->toHaveKey('Dark Themes');
    expect($categories['Light Themes'])->toHaveCount(4);
    expect($categories['Dark Themes'])->toHaveCount(5);
});


it('Theme enum provides default themes', function () {
    $defaultLight = Theme::getDefaultLight();
    $defaultDark = Theme::getDefaultDark();
    $default = Theme::getDefault();

    expect($defaultLight)->toBe(Theme::GitHub);
    expect($defaultDark)->toBe(Theme::Monokai);
    expect($default)->toBe(Theme::GitHub);
});

it('can use Theme enum in AceEditor theme method', function () {
    $field = AceEditor::make('code')
        ->theme(Theme::Monokai);

    expect(callNonPublic($field, 'getTheme'))->toBe('ace/theme/monokai');
});

it('can use Theme enum in AceEditor darkTheme method', function () {
    $field = AceEditor::make('code')
        ->darkTheme(Theme::Dracula);

    expect($field->getDarkTheme())->toBe('ace/theme/dracula');
});

it('AceEditor theme method accepts both enum and string', function () {
    // Enum usage
    $enumField = AceEditor::make('code')
        ->theme(Theme::GitHub);
    expect(callNonPublic($enumField, 'getTheme'))->toBe('ace/theme/github');

    // String usage
    $stringField = AceEditor::make('code')
        ->theme('github');
    expect(callNonPublic($stringField, 'getTheme'))->toBe('ace/theme/github');
});

it('AceEditor provides theme methods', function () {
    // Test all new theme methods
    $allThemes = AceEditor::getAvailableThemes();
    $themesByCategory = AceEditor::getThemesByCategory();
    $lightThemes = AceEditor::getLightThemes();
    $darkThemes = AceEditor::getDarkThemes();

    expect($allThemes)->toBeArray();
    expect($allThemes)->toHaveCount(9);

    expect($themesByCategory)->toBeArray();
    expect($themesByCategory)->toHaveKey('Light Themes');
    expect($themesByCategory)->toHaveKey('Dark Themes');

    expect($lightThemes)->toBeArray();
    expect($lightThemes)->toHaveCount(4);

    expect($darkThemes)->toBeArray();
    expect($darkThemes)->toHaveCount(5);
});
