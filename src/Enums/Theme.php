<?php

declare(strict_types=1);

namespace Riodwanto\FilamentAceEditor\Enums;

enum Theme: string
{
    case GitHub = 'github';
    case SolarizedLight = 'solarized_light';
    case TextMate = 'textmate';
    case Eclipse = 'eclipse';
    case Dracula = 'dracula';
    case Monokai = 'monokai';
    case OneDark = 'one_dark';
    case NordDark = 'nord_dark';
    case SolarizedDark = 'solarized_dark';

    public function getLabel(): string
    {
        return match ($this) {
            self::GitHub => 'GitHub',
            self::SolarizedLight => 'Solarized Light',
            self::TextMate => 'TextMate',
            self::Eclipse => 'Eclipse',
            self::Dracula => 'Dracula',
            self::Monokai => 'Monokai',
            self::OneDark => 'One Dark',
            self::NordDark => 'Nord Dark',
            self::SolarizedDark => 'Solarized Dark',
        };
    }

    public function getAceTheme(): string
    {
        return "ace/theme/{$this->value}";
    }

    public function isDark(): bool
    {
        return match ($this) {
            self::Dracula, self::Monokai, self::OneDark, self::NordDark, self::SolarizedDark => true,
            self::GitHub, self::SolarizedLight, self::TextMate, self::Eclipse => false,
        };
    }

    public function isLight(): bool
    {
        return !$this->isDark();
    }

    public static function toArray(): array
    {
        $themes = [];
        foreach (self::cases() as $theme) {
            $themes[$theme->value] = $theme->getLabel();
        }
        return $themes;
    }

    public static function getLightThemes(): array
    {
        return array_filter(
            self::toArray(),
            fn($_themeLabel, $themeValue) => self::from($themeValue)->isLight(),
            ARRAY_FILTER_USE_BOTH
        );
    }

    public static function getDarkThemes(): array
    {
        return array_filter(
            self::toArray(),
            fn($_themeLabel, $themeValue) => self::from($themeValue)->isDark(),
            ARRAY_FILTER_USE_BOTH
        );
    }

    public static function getByCategory(): array
    {
        return [
            'Light Themes' => self::getLightThemes(),
            'Dark Themes' => self::getDarkThemes(),
        ];
    }

    public static function getDefaultLight(): self
    {
        return self::GitHub;
    }

    public static function getDefaultDark(): self
    {
        return self::Monokai;
    }

    public static function getDefault(): self
    {
        return self::getDefaultLight();
    }
}
