package translations

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

type (
	Dictionary  map[string]Translation
	Translation map[string]string
)

func SetTranslation(path, tKey, langCode, value string) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return fmt.Errorf("file open error: %w", err)
	}
	defer f.Close()
	b, err := io.ReadAll(f)
	if err != nil {
		return fmt.Errorf("file read error: %w", err)
	}
	var dict Dictionary
	if len(b) > 0 {
		err = json.Unmarshal(b, &dict)
		if err != nil {
			return fmt.Errorf("json read error: %w", err)
		}
	}
	t, ok := dict[tKey]
	if !ok {
		t = Translation{}
		dict[tKey] = t
	}
	t[langCode] = value
	b, err = json.MarshalIndent(dict, "", "  ")
	if err != nil {
		return fmt.Errorf("json write error: %w", err)
	}
	_, err = f.Write(b)
	if err != nil {
		return fmt.Errorf("file write error: %w", err)
	}
	return nil
}
