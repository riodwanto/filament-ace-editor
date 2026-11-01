<?php

use Filament\Forms\ComponentContainer;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Schemas\Schema;
use Livewire\Component;
use Riodwanto\FilamentAceEditor\Tests\TestCase;

uses(TestCase::class)->in(__DIR__);

function callNonPublic(object $object, string $method): mixed
{
    return (new ReflectionMethod($object, $method))->invoke($object);
}

function fieldContainer(): object
{
    if (class_exists(Schema::class)) {
        return Schema::make();
    }

    // Filament 3's container needs a Livewire component
    return ComponentContainer::make(new class extends Component implements HasForms {
        use InteractsWithForms;

        public function render(): string
        {
            return '';
        }
    });
}
