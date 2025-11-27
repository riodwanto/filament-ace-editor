<?php

declare(strict_types=1);

namespace Riodwanto\FilamentAceEditor\Enums;

enum Language: string
{
    case ABAP = 'abap';
    case ABC = 'abc';
    case ActionScript = 'actionscript';
    case ADA = 'ada';
    case Alda = 'alda';
    case ApacheConf = 'apache_conf';
    case Apex = 'apex';
    case AQL = 'aql';
    case AsciiDoc = 'asciidoc';
    case ASL = 'asl';
    case AssemblyARM32 = 'assembly_arm32';
    case AssemblyX86 = 'assembly_x86';
    case Astro = 'astro';
    case AutoHotKey = 'autohotkey';
    case BatchFile = 'batchfile';
    case C9Search = 'c9search';
    case CCpp = 'c_cpp';
    case CSharp = 'csharp';
    case Cirru = 'cirru';
    case Clojure = 'clojure';
    case Cobol = 'cobol';
    case CoffeeScript = 'coffee';
    case ColdFusion = 'coldfusion';
    case Crystal = 'crystal';
    case CsoundDocument = 'csound_document';
    case CsoundOrchestra = 'csound_orchestra';
    case CsoundScore = 'csound_score';
    case CSS = 'css';
    case Curly = 'curly';
    case D = 'd';
    case Dart = 'dart';
    case Diff = 'diff';
    case Django = 'django';
    case Dockerfile = 'dockerfile';
    case Dot = 'dot';
    case Drools = 'drools';
    case Edifact = 'edifact';
    case Eiffel = 'eiffel';
    case EJS = 'ejs';
    case Elixir = 'elixir';
    case Elm = 'elm';
    case Erlang = 'erlang';
    case Flix = 'flix';
    case Fortran = 'fortran';
    case FSharp = 'fsharp';
    case Gcode = 'gcode';
    case Gherkin = 'gherkin';
    case Gitignore = 'gitignore';
    case Glsl = 'glsl';
    case Go = 'go';
    case Gobstones = 'gobstones';
    case GraphQLSchema = 'graphqlschema';
    case Groovy = 'groovy';
    case HAML = 'haml';
    case Handlebars = 'handlebars';
    case Haskell = 'haskell';
    case HaskellCabal = 'haskell_cabal';
    case Haxe = 'haxe';
    case Hjson = 'hjson';
    case HTML = 'html';
    case HTML_Elixir = 'html_elixir';
    case HTML_Ruby = 'html_ruby';
    case INI = 'ini';
    case Io = 'io';
    case Jack = 'jack';
    case Jade = 'jade';
    case Java = 'java';
    case JavaScript = 'javascript';
    case JSON = 'json';
    case JSON5 = 'json5';
    case JSONiq = 'jsoniq';
    case JSP = 'jsp';
    case JSSM = 'jssm';
    case JSX = 'jsx';
    case Julia = 'julia';
    case Kotlin = 'kotlin';
    case Shell = 'sh';
    case TypeScript = 'typescript';
    case LaTeX = 'latex';
    case Latte = 'latte';
    case Less = 'less';
    case Liquid = 'liquid';
    case Lisp = 'lisp';
    case LiveScript = 'livescript';
    case LogiQL = 'logiql';
    case LogTalk = 'logtalk';
    case LSL = 'lsl';
    case Lua = 'lua';
    case LuaPage = 'luapage';
    case Lucene = 'lucene';
    case Makefile = 'makefile';
    case Markdown = 'markdown';
    case Mask = 'mask';
    case MATLAB = 'matlab';
    case Maze = 'maze';
    case MediaWiki = 'mediawiki';
    case MIPS = 'mips';
    case Mixal = 'mixal';
    case MUSHCode = 'mushcode';
    case MySQL = 'mysql';
    case Nginx = 'nginx';
    case Nim = 'nim';
    case Nix = 'nix';
    case NSIS = 'nsis';
    case Nunjucks = 'nunjucks';
    case ObjectiveC = 'objectivec';
    case OCaml = 'ocaml';
    case PartiQL = 'partiql';
    case Pascal = 'pascal';
    case Perl = 'perl';
    case pgSQL = 'pgsql';
    case PHP = 'php';
    case PHP_LaravelBlade = 'php_laravel_blade';
    case Pig = 'pig';
    case Powershell = 'powershell';
    case Praat = 'praat';
    case Prisma = 'prisma';
    case Prolog = 'prolog';
    case Properties = 'properties';
    case Protobuf = 'protobuf';
    case Puppet = 'puppet';
    case Python = 'python';
    case R = 'r';
    case Razor = 'razor';
    case RDoc = 'rdoc';
    case Red = 'red';
    case Redshift = 'redshift';
    case RHTML = 'rhtml';
    case Robot = 'robot';
    case RST = 'rst';
    case Ruby = 'ruby';
    case Rust = 'rust';
    case SASS = 'sass';
    case SCAD = 'scad';
    case Scala = 'scala';
    case Scheme = 'scheme';
    case SCSS = 'scss';
    case SJS = 'sjs';
    case Slim = 'slim';
    case Smarty = 'smarty';
    case Snippets = 'snippets';
    case SoyTemplate = 'soy_template';
    case Space = 'space';
    case Sparql = 'sparql';
    case SQL = 'sql';
    case SQLServer = 'sqlserver';
    case Stylus = 'stylus';
    case SVG = 'svg';
    case Swift = 'swift';
    case Tcl = 'tcl';
    case Terraform = 'terraform';
    case Tex = 'tex';
    case Text = 'text';
    case Textile = 'textile';
    case Toml = 'toml';
    case TSX = 'tsx';
    case Turtle = 'turtle';
    case Twig = 'twig';
    case Vala = 'vala';
    case VBScript = 'vbscript';
    case Velocity = 'velocity';
    case Verilog = 'verilog';
    case VHDL = 'vhdl';
    case Visualforce = 'visualforce';
    case Wollok = 'wollok';
    case XML = 'xml';
    case XQuery = 'xquery';
    case YAML = 'yaml';
    case Zeek = 'zeek';

    public function getLabel(): string
    {
        return match ($this) {
            self::CCpp => 'C/C++',
            self::CSharp => 'C#',
            self::CSS => 'CSS',
            self::Go => 'Go',
            self::HTML => 'HTML',
            self::Java => 'Java',
            self::JavaScript => 'JavaScript',
            self::JSON => 'JSON',
            self::Markdown => 'Markdown',
            self::PHP => 'PHP',
            self::Python => 'Python',
            self::SQL => 'SQL',
            self::XML => 'XML',
            self::YAML => 'YAML',
            self::TypeScript => 'TypeScript',
            self::Rust => 'Rust',
            self::Ruby => 'Ruby',
            self::Dockerfile => 'Dockerfile',
            self::Shell => 'Shell',
            self::Elixir => 'Elixir',
            default => str_replace('_', ' ', $this->value),
        };
    }


    public function getAceMode(): string
    {
        return $this->value;
    }

    public static function toArray(): array
    {
        $languages = [];
        foreach (self::cases() as $language) {
            $languages[$language->value] = $language->getLabel();
        }
        return $languages;
    }

    public static function getByCategory(): array
    {
        return [
            'Web' => [
                self::HTML,
                self::CSS,
                self::JavaScript,
                self::TypeScript,
                self::JSON,
            ],
            'Backend' => [
                self::PHP,
                self::Python,
                self::Java,
                self::Ruby,
                self::Go,
                self::Rust,
                self::CSharp,
            ],
            'Data & Config' => [
                self::SQL,
                self::XML,
                self::YAML,
                self::JSON,
                self::Markdown,
                self::Dockerfile,
            ],
            'Mobile' => [
                self::Swift,
                self::Kotlin,
                self::Dart,
            ],
        ];
    }


    public static function fromExtension(string $extension): ?self
    {
        $extension = strtolower(ltrim($extension, '.'));

        $extensionMap = [
            'js' => self::JavaScript,
            'jsx' => self::JSX,
            'ts' => self::TypeScript,
            'tsx' => self::TSX,
            'css' => self::CSS,
            'scss' => self::SCSS,
            'sass' => self::SASS,
            'less' => self::Less,
            'html' => self::HTML,
            'htm' => self::HTML,
            'php' => self::PHP,
            'py' => self::Python,
            'java' => self::Java,
            'go' => self::Go,
            'rb' => self::Ruby,
            'rs' => self::Rust,
            'cs' => self::CSharp,
            'kt' => self::Kotlin,
            'ex' => self::Elixir,
            'exs' => self::Elixir,
            'json' => self::JSON,
            'xml' => self::XML,
            'yaml' => self::YAML,
            'yml' => self::YAML,
            'md' => self::Markdown,
            'sql' => self::SQL,
            'sh' => self::Shell,
            'bash' => self::Shell,
            'dockerfile' => self::Dockerfile,
        ];

        return $extensionMap[$extension] ?? null;
    }
}
