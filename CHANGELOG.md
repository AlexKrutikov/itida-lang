# Changelog

All notable changes to the "Itida Lang" extension will be documented in this file.

## [1.1.4] - 2026-04-01

### Added

- Команда «Айтида: Создать функцию библиотеки» (`Ctrl+Shift+P`) — создание новой функции в библиотеке через интерактивный диалог: выбор библиотеки, папки (группы), ввод имени и параметров, признак локальной функции. Автоматически создаёт `.txt` и `.json` файлы

## [1.1.2] - 2026-04-01

### Fixed

- Исправлен сниппет вывода сообщений: `Сообщить` → `Сообщение` (корректное имя встроенной функции)
- Обновлены префикс и тело сниппета — добавлен параметр `заголовок сообщения`

## [1.1.1] - 2026-04-01

### Added

- Добавлены ~150 недостающих встроенных функций в автодополнение, подсказки и Signature Help: строковые (PADL, PADR, RAT, STDA, STDE, STRTRANC, STRINGREAD, ENVVAR, TRANSLATENUMBERRUR, ARRAYTOSTRING, STRINGTOARRAY, ITEM, ENCRYPTTEXT, DECRYPTTEXT), даты (TTOD, CDOW, GOYEAR, HOUR, MINUTE, SECOND, MONTHNAME, TIME, WEEK, QUARTER, MONTHFIRSTDATE, MONTHLASTDATE), JSON (GETVJSON, JSONTOVARS, JSONDATA), данные (LOADDATA, EXPORTDATA), контексты (GO, CREATEINDEX, FIND, FINDINDEX, FINDCONTINUE, REPLACE, FIELDVALUE, FIELDVALUETYPE, SELECTINDEX, UPLOAD, DOWNLOAD, UPLOADJSON, CONTEXTNAME, LOADRECORD, GATHERRECORD), соединения (SELECTCONNECTION, CONNECTION), таблицы/DBF (26 функций TABLE*), системные (ADDMESSAGE, EVALUATE, VARIABLE, MESSAGEBOX, PROGRESSBAR, SYSTEMMESSAGE, UNIQUENAME, SENDMESSAGE, POSTMESSAGE, CREATEOBJECT, SHELLEXECUTE, MESSAGELOG, FORMAT, ISSYMBOL, ISDIGIT, ISIDENTIFIER, THREAD, PROCESSEVENTS, TICKCOUNT, CREATEFORM, PDF417, MD5, SHA256, UUID, CRYPTOGRAPHY, CERTIFICATES, DEBUGGER), сокеты (SOCKETCONNECT, SOCKETSEND, SOCKETRECIEVE, SOCKETCLOSE), FTP (12 функций), HTTP (9 функций), COM-порт (COMOPEN, COMCLOSE, COMREAD, COMWRITE), файлы (20+ функций + DIRECTORYCREATE), XML (9 функций), архивы (ZIP, ZIPOPEN, ZIPCLOSE, RAR, RAROPEN, RARCLOSE)
- Добавлены новые категории подсветки синтаксиса: сети (FTP, HTTP, сокеты, COM), таблицы DBF, XML, архивы
- Все новые функции добавлены в TextMate грамматику (`itida.tmLanguage.json`) с подсветкой по категориям
- Настройки цвета для новых категорий в светлой и тёмной теме

### Fixed

- Исправлена сигнатура STR — добавлен параметр `СистемаСчисления` (число от 2 до 36)
- Исправлена сигнатура QUERY — добавлена альтернатива `СписокФилиалов` для третьего параметра
- Исправлена сигнатура ADDCONTEXT — добавлены недостающие параметры `ТекстСообщения` и `НомерСоединения|СписокФилиалов`
- Исправлена сигнатура APPEND — добавлены параметры `Выражение`, `СписокВключаемыхПолей`, `СписокИсключаемыхПолей`
- Дополнены regex-паттерны подсветки для групп контекстов, файлов, UI и прочих функций

## [1.0.0] - 2026-04-01

### Added

- Подключение библиотек функций Айтиды из каталога с выгруженными файлами
- Настройка `itida.functionLibraryPath` — путь к каталогу библиотек функций
- Автодополнение функций библиотек при вводе алиаса и точки (например `RESTAPI.`)
- Автодополнение алиасов библиотек как модулей
- Hover-подсказки для библиотечных функций (сигнатура, описание, группа, библиотека)
- Hover-подсказки для алиасов библиотек (название, тип, количество функций)
- Подсказки параметров (Signature Help) для библиотечных функций
- Переход к определению функции (F12 / Ctrl+Click) — для функций документа и библиотечных функций (открывает .txt исходник)
- Автоматическая перезагрузка библиотек при изменении JSON-файлов в каталоге
- Команда "Айтида: Перезагрузить библиотеки функций" в палитре команд

## [0.1.1] - 2026-04-01

### Added

- Иконка расширения

## [0.1.0] - 2026-04-01

### Added

- Подсветка синтаксиса для языка вычислителя Айтида (файлы `.itd`)
- Подсветка SQL-блоков (`__SQL {}`, `SQLAGGREGATE {}`) с отдельной цветовой схемой
- Различение понятий (`@Понятие`) и SQL-переменных (`@переменная`) по цвету
- Подсветка шаблонных вставок `[[ переменная ]]` внутри SQL-блоков
- Цветовая схема для светлых и тёмных тем, приближенная к оригинальному редактору Айтида
- Сниппеты для часто используемых конструкций
- Лицензия MIT
