package main

import (
	"flag"
	"fmt"
	"os"

	translations "github.com/amphipath/riichiinfo/translations"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: translation set [-k KEY] [-l LANG] [-v VALUE] | set KEY LANG VALUE")
	}

	switch args[0] {
	case "set":
		return runSet(args[1:])
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}

func runSet(args []string) error {
	fs := flag.NewFlagSet("set", flag.ContinueOnError)
	k := fs.String("k", "", "translation key")
	l := fs.String("l", "", "language code")
	v := fs.String("v", "", "translated string")

	if err := fs.Parse(args); err != nil {
		return err
	}

	key, lang, value := *k, *l, *v

	// fall back to positional args for any unset flags
	pos := fs.Args()
	if key == "" {
		if len(pos) < 1 {
			return fmt.Errorf("-k / KEY is required")
		}
		key, pos = pos[0], pos[1:]
	}
	if lang == "" {
		if len(pos) < 1 {
			return fmt.Errorf("-l / LANGUAGE_CODE is required")
		}
		lang, pos = pos[0], pos[1:]
	}
	if value == "" {
		if len(pos) < 1 {
			return fmt.Errorf("-v / VALUE is required")
		}
		value = pos[0]
	}

	path := os.Getenv("DICT_PATH")
	if path == "" {
		return fmt.Errorf("DICT_PATH environment variable is not set")
	}

	return translations.SetTranslation(path, key, lang, value)
}
