<?php

use Riodwanto\FilamentAceEditor\Tests\TestCase;

uses(TestCase::class)->in(__DIR__);

function callNonPublic(object $object, string $method): mixed
{
    return (new ReflectionMethod($object, $method))->invoke($object);
}
