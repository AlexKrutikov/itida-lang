import * as vscode from 'vscode';
import { LibraryStore, LibraryFunction } from './libraryLoader';

// ========================= LIBRARY STORE (singleton) =========================

const libraryStore = new LibraryStore();

function loadLibraries(): void {
    const config = vscode.workspace.getConfiguration('itida');
    const libPath = config.get<string>('functionLibraryPath', '');
    if (libPath) {
        const count = libraryStore.load(libPath);
        if (count > 0) {
            vscode.window.setStatusBarMessage(`Айтида: загружено ${count} библиотечных функций из ${libraryStore.libraries.length} библиотек`, 5000);
        }
    } else {
        libraryStore.clear();
    }
}

// ========================= DATA =========================

interface KeywordInfo {
    label: string;
    detail: string;
    documentation: string;
    kind: vscode.CompletionItemKind;
}

const KEYWORDS: KeywordInfo[] = [
    { label: 'IF', detail: 'Условный оператор', documentation: 'Условный оператор. IF ( условие ) { ... } ELSE { ... }', kind: vscode.CompletionItemKind.Keyword },
    { label: 'ELSE', detail: 'Ветка "иначе"', documentation: 'Альтернативная ветка для IF', kind: vscode.CompletionItemKind.Keyword },
    { label: 'WHILE', detail: 'Цикл', documentation: 'Цикл с предусловием. WHILE ( условие ) { ... }', kind: vscode.CompletionItemKind.Keyword },
    { label: 'BREAK', detail: 'Прервать цикл', documentation: 'Прерывает выполнение цикла WHILE', kind: vscode.CompletionItemKind.Keyword },
    { label: 'CONTINUE', detail: 'Продолжить цикл', documentation: 'Переходит к следующей итерации цикла WHILE', kind: vscode.CompletionItemKind.Keyword },
    { label: 'RETURN', detail: 'Возврат', documentation: 'Возвращает значение из функции. Если RETURN без значения — возвращает ИСТИНА', kind: vscode.CompletionItemKind.Keyword },
    { label: 'TRY', detail: 'Обработка ошибок', documentation: 'Блок обработки исключений. TRY { ... } CATCH { ... }', kind: vscode.CompletionItemKind.Keyword },
    { label: 'CATCH', detail: 'Перехват ошибки', documentation: 'Блок обработки ошибки после TRY', kind: vscode.CompletionItemKind.Keyword },
    { label: 'BEGIN', detail: 'Начало блока', documentation: 'Начало блока операторов (SQL контекст)', kind: vscode.CompletionItemKind.Keyword },
    { label: 'END', detail: 'Конец блока', documentation: 'Конец блока операторов (SQL контекст)', kind: vscode.CompletionItemKind.Keyword },
    { label: 'FUNCTION', detail: 'Объявление функции', documentation: 'FUNCTION [LOCAL] ИмяФункции(параметры) { ... }', kind: vscode.CompletionItemKind.Keyword },
    { label: 'ФУНКЦИЯ', detail: 'Объявление функции', documentation: 'ФУНКЦИЯ [LOCAL|ЛОКАЛЬНАЯ] ИмяФункции(параметры) { ... }', kind: vscode.CompletionItemKind.Keyword },
    { label: 'PUBLIC', detail: 'Публичная переменная', documentation: 'Объявление публичной переменной, доступной во всех функциях', kind: vscode.CompletionItemKind.Keyword },
    { label: 'LOCAL', detail: 'Локальная переменная', documentation: 'Объявление локальной переменной, видимой только в текущей функции', kind: vscode.CompletionItemKind.Keyword },
    { label: 'ЛОКАЛЬНАЯ', detail: 'Локальная функция', documentation: 'Модификатор функции — функция видна только в текущем скрипте', kind: vscode.CompletionItemKind.Keyword },
    { label: 'CONCEPT', detail: 'Понятие', documentation: 'Объявление понятия — поименованного правила получения данных из БД', kind: vscode.CompletionItemKind.Keyword },
    { label: 'ПОНЯТИЕ', detail: 'Понятие', documentation: 'Объявление понятия — поименованного правила получения данных из БД', kind: vscode.CompletionItemKind.Keyword },
    { label: 'CONSTANT', detail: 'Константа', documentation: 'Объявление константы', kind: vscode.CompletionItemKind.Keyword },
    { label: 'КОНСТАНТА', detail: 'Константа', documentation: 'Объявление константы', kind: vscode.CompletionItemKind.Keyword },
    { label: 'OBJECT', detail: 'Объект', documentation: 'Объявление объекта', kind: vscode.CompletionItemKind.Keyword },
    { label: 'ОБЪЕКТ', detail: 'Объект', documentation: 'Объявление объекта', kind: vscode.CompletionItemKind.Keyword },
    { label: 'SQL', detail: 'SQL понятие', documentation: 'Понятие-SQL выражение для получения данных из БД', kind: vscode.CompletionItemKind.Keyword },
    { label: 'SQLAGGREGATE', detail: 'SQL агрегат', documentation: 'SQL агрегатное понятие', kind: vscode.CompletionItemKind.Keyword },
    { label: 'SQLERROR', detail: 'SQL ошибка', documentation: 'Обработка SQL ошибки', kind: vscode.CompletionItemKind.Keyword },
    { label: 'AND', detail: 'Логическое И', documentation: 'Логический оператор конъюнкции', kind: vscode.CompletionItemKind.Operator },
    { label: 'OR', detail: 'Логическое ИЛИ', documentation: 'Логический оператор дизъюнкции', kind: vscode.CompletionItemKind.Operator },
    { label: 'XOR', detail: 'Исключающее ИЛИ', documentation: 'Логический оператор исключающего ИЛИ', kind: vscode.CompletionItemKind.Operator },
    { label: 'true', detail: 'ИСТИНА', documentation: 'Логическое значение Истина', kind: vscode.CompletionItemKind.Constant },
    { label: 'false', detail: 'ЛОЖЬ', documentation: 'Логическое значение Ложь', kind: vscode.CompletionItemKind.Constant },
    { label: 'ИСТИНА', detail: 'Логическая константа', documentation: 'Логическое значение Истина (синоним true)', kind: vscode.CompletionItemKind.Constant },
    { label: 'ЛОЖЬ', detail: 'Логическая константа', documentation: 'Логическое значение Ложь (синоним false)', kind: vscode.CompletionItemKind.Constant },
];

interface BuiltinFunctionInfo {
    label: string;
    labelAlt?: string;
    detail: string;
    documentation: string;
    signature: string;
    params: { label: string; documentation: string }[];
}

const BUILTIN_FUNCTIONS: BuiltinFunctionInfo[] = [
    // Строковые
    { label: 'ALLTRIM', labelAlt: 'СЖАТЬПРОБЕЛЫ', detail: 'Удаление пробелов', documentation: 'Убирает все лидирующие и завершающие пробелы', signature: 'ALLTRIM(Строка)', params: [{ label: 'Строка', documentation: 'Строка, из которой убрать пробелы' }] },
    { label: 'AT', labelAlt: 'ПОЗИЦИЯ', detail: 'Поиск подстроки', documentation: 'Возвращает позицию вхождения подстроки (с учетом регистра)', signature: 'AT(СтрокаГдеИскать, СтрокаЧтоИскать[, НомерВхождения])', params: [{ label: 'СтрокаГдеИскать', documentation: 'Строка для поиска' }, { label: 'СтрокаЧтоИскать', documentation: 'Искомая подстрока' }, { label: 'НомерВхождения', documentation: 'Номер вхождения (необязательный)' }] },
    { label: 'ATC', labelAlt: 'ПОЗИЦИЯР', detail: 'Поиск подстроки (без регистра)', documentation: 'Возвращает позицию вхождения подстроки (без учета регистра)', signature: 'ATC(СтрокаГдеИскать, СтрокаЧтоИскать[, НомерВхождения])', params: [{ label: 'СтрокаГдеИскать', documentation: 'Строка для поиска' }, { label: 'СтрокаЧтоИскать', documentation: 'Искомая подстрока' }, { label: 'НомерВхождения', documentation: 'Номер вхождения (необязательный)' }] },
    { label: 'CHR', labelAlt: 'СИМВОЛПОКОДУ', detail: 'Символ по коду', documentation: 'Возвращает символ по его коду (0-255)', signature: 'CHR(КодСимвола)', params: [{ label: 'КодСимвола', documentation: 'Число от 0 до 255' }] },
    { label: 'ASC', labelAlt: 'КОДСИМВОЛА', detail: 'Код символа', documentation: 'Возвращает код первого символа строки', signature: 'ASC(Символ)', params: [{ label: 'Символ', documentation: 'Строка, код первого символа которой вернуть' }] },
    { label: 'LEFT', labelAlt: 'ЛЕВСИМВ', detail: 'Левая часть строки', documentation: 'Возвращает указанное количество начальных символов', signature: 'LEFT(Строка, КоличествоСимволов)', params: [{ label: 'Строка', documentation: 'Исходная строка' }, { label: 'КоличествоСимволов', documentation: 'Количество символов' }] },
    { label: 'RIGHT', labelAlt: 'ПРАВСИМВ', detail: 'Правая часть строки', documentation: 'Возвращает указанное количество конечных символов', signature: 'RIGHT(Строка, КоличествоСимволов)', params: [{ label: 'Строка', documentation: 'Исходная строка' }, { label: 'КоличествоСимволов', documentation: 'Количество символов' }] },
    { label: 'SUBSTR', labelAlt: 'ПОДСТРОКА', detail: 'Подстрока', documentation: 'Возвращает подстроку начиная с указанной позиции', signature: 'SUBSTR(Строка, НачальнаяПозиция[, КоличествоСимволов])', params: [{ label: 'Строка', documentation: 'Исходная строка' }, { label: 'НачальнаяПозиция', documentation: 'Начальная позиция (с 1)' }, { label: 'КоличествоСимволов', documentation: 'Количество символов (необязательный)' }] },
    { label: 'LEN', labelAlt: 'ДЛИНА', detail: 'Длина строки', documentation: 'Возвращает длину строки', signature: 'LEN(Строка)', params: [{ label: 'Строка', documentation: 'Строка' }] },
    { label: 'UPPER', labelAlt: 'ПРОПИСНЫЕ', detail: 'В верхний регистр', documentation: 'Преобразует строку в прописные символы', signature: 'UPPER(Строка)', params: [{ label: 'Строка', documentation: 'Строка' }] },
    { label: 'LOWER', labelAlt: 'СТРОЧНЫЕ', detail: 'В нижний регистр', documentation: 'Преобразует строку в строчные символы', signature: 'LOWER(Строка)', params: [{ label: 'Строка', documentation: 'Строка' }] },
    { label: 'LTRIM', labelAlt: 'СЖАТЬПРОБЕЛЫЛЕВ', detail: 'Удаление пробелов слева', documentation: 'Убирает лидирующие пробелы', signature: 'LTRIM(Строка)', params: [{ label: 'Строка', documentation: 'Строка' }] },
    { label: 'RTRIM', labelAlt: 'СЖАТЬПРОБЕЛЫПРАВ', detail: 'Удаление пробелов справа', documentation: 'Убирает завершающие пробелы', signature: 'RTRIM(Строка)', params: [{ label: 'Строка', documentation: 'Строка' }] },
    { label: 'STRTRAN', labelAlt: 'ЗАМЕНИТЬ', detail: 'Замена подстроки', documentation: 'Заменяет вхождения подстроки (с учетом регистра)', signature: 'STRTRAN(СтрокаПоиска, ИскомаяСтрока, Замена[, НомерФрагмента[, КоличествоЗамен]])', params: [{ label: 'СтрокаПоиска', documentation: 'Строка для поиска' }, { label: 'ИскомаяСтрока', documentation: 'Что заменить' }, { label: 'Замена', documentation: 'На что заменить' }] },
    { label: 'STR', labelAlt: 'СТРОКА', detail: 'Число в строку', documentation: 'Преобразует число в строку указанной длины', signature: 'STR(Число[, Длина[, КоличествоЗнаков[, СжиматьПробелы[, УбиратьНули]]]])', params: [{ label: 'Число', documentation: 'Число для преобразования' }, { label: 'Длина', documentation: 'Длина результата (по умолчанию 10)' }, { label: 'КоличествоЗнаков', documentation: 'Знаков после запятой (по умолчанию 0)' }] },
    { label: 'STDF', detail: 'Строка для SQL', documentation: 'Преобразует строку для безошибочного использования в SQL запросе', signature: 'STDF(Строка[, Длина])', params: [{ label: 'Строка', documentation: 'Строка для преобразования' }, { label: 'Длина', documentation: 'Максимальная длина (необязательный)' }] },
    { label: 'REPLICATE', labelAlt: 'КОПИРОВАТЬ', detail: 'Повторение строки', documentation: 'Возвращает строку из повторений символа/строки', signature: 'REPLICATE(Символ|Строка, КоличествоПовторов)', params: [{ label: 'Символ|Строка', documentation: 'Символ или строка для повторения' }, { label: 'КоличествоПовторов', documentation: 'Количество повторений' }] },
    { label: 'SPACE', labelAlt: 'ПРОБЕЛЫ', detail: 'Строка пробелов', documentation: 'Возвращает строку из указанного количества пробелов', signature: 'SPACE(Количество)', params: [{ label: 'Количество', documentation: 'Количество пробелов' }] },
    { label: 'GETWORD', labelAlt: 'ПОЛУЧИТЬСЛОВО', detail: 'Слово из строки', documentation: 'Возвращает указанное слово из строки', signature: 'GETWORD(Строка[, ОграничителиНачала[, ОграничителиКонца[, НомерСлова[, НачальнаяПозиция]]]])', params: [{ label: 'Строка', documentation: 'Строка для поиска' }] },
    { label: 'TRANSLATENUMBER', labelAlt: 'ПРОПИСЬ', detail: 'Число прописью', documentation: 'Возвращает число прописью с правильным склонением слова', signature: 'TRANSLATENUMBER(Число, Слово1, Слово2, Слово5[, КоличествоЗнаков[, МужЖенСредРод]])', params: [{ label: 'Число', documentation: 'Число' }, { label: 'Слово1', documentation: 'Им.п. ед.ч. (1 стол)' }, { label: 'Слово2', documentation: 'Род.п. ед.ч. (2 стола)' }, { label: 'Слово5', documentation: 'Род.п. мн.ч. (5 столов)' }] },
    { label: 'TRANSLATE', labelAlt: 'ПЕРЕКОДИРОВАТЬ', detail: 'Перекодировка строки', documentation: 'Перекодирует строку из одной кодировки в другую (ANSI, OEM, UTF-8, UTF-16, KOI8)', signature: 'TRANSLATE(Строка, ИсходнаяКодировка, РезультирующаяКодировка)', params: [{ label: 'Строка', documentation: 'Строка для перекодировки' }, { label: 'ИсходнаяКодировка', documentation: 'ANSI, OEM, UTF-8, UTF-16, Unicode или код' }, { label: 'РезультирующаяКодировка', documentation: 'ANSI, OEM, UTF-8, UTF-16, Unicode, KOI8 или код' }] },

    // Даты
    { label: 'DATE', labelAlt: 'ДАТА', detail: 'Текущая дата', documentation: 'Возвращает текущую системную дату без времени', signature: 'DATE()', params: [] },
    { label: 'DATETIME', labelAlt: 'ДАТАВРЕМЯ', detail: 'Текущая дата и время', documentation: 'Возвращает текущие дату и время', signature: 'DATETIME()', params: [] },
    { label: 'DTOC', labelAlt: 'СТРОКАИЗДАТЫ', detail: 'Дата в строку', documentation: 'Преобразует дату в строку в указанном формате (0-7)', signature: 'DTOC(Дата[, ФорматДаты[, Разделитель]])', params: [{ label: 'Дата', documentation: 'Дата для преобразования' }, { label: 'ФорматДаты', documentation: '0-ДД.ММ.ГГ, 4-ДД.ММ.ГГГГ, 7-ГГГГ.ММ.ДД' }] },
    { label: 'TTOC', labelAlt: 'СТРОКАИЗВРЕМЕНИ', detail: 'ДатаВремя в строку', documentation: 'Преобразует дату и время в строку', signature: 'TTOC(ДатаВремя[, ФорматДаты[, РазделительДаты[, РазделительДатыИВремени[, РазделительВремени]]]])', params: [{ label: 'ДатаВремя', documentation: 'Дата и время' }, { label: 'ФорматДаты', documentation: 'Формат (0-8)' }] },
    { label: 'CTOD', labelAlt: 'ДАТАИЗСТРОКИ', detail: 'Строка в дату', documentation: 'Преобразует строку или число в дату', signature: 'CTOD(Строка|Число)', params: [{ label: 'Строка|Число', documentation: 'Строка ДД.ММ.ГГГГ или число (юлианский день)' }] },
    { label: 'GODAY', labelAlt: 'ДОБАВИТЬДНИ', detail: 'Прибавить дни', documentation: 'Возвращает дату, отстоящую на указанное количество дней', signature: 'GODAY(Дата[, КоличествоДней])', params: [{ label: 'Дата', documentation: 'Исходная дата' }, { label: 'КоличествоДней', documentation: 'Количество дней (по умолчанию 1)' }] },
    { label: 'GOMONTH', labelAlt: 'ДОБАВИТЬМЕСЯЦЫ', detail: 'Прибавить месяцы', documentation: 'Возвращает дату, отстоящую на указанное количество месяцев', signature: 'GOMONTH(Дата[, КоличествоМесяцев])', params: [{ label: 'Дата', documentation: 'Исходная дата' }, { label: 'КоличествоМесяцев', documentation: 'Количество месяцев (по умолчанию 1)' }] },
    { label: 'DATEDIFF', labelAlt: 'РАЗНИЦАДАТ', detail: 'Разница дат', documentation: 'Вычисляет разницу между двумя датами в указанных единицах', signature: 'DATEDIFF(Дата1, Дата2, СравниваемаяЧасть)', params: [{ label: 'Дата1', documentation: 'Первая дата' }, { label: 'Дата2', documentation: 'Вторая дата' }, { label: 'СравниваемаяЧасть', documentation: 'sec, min, hour, day, mon, year' }] },
    { label: 'DAY', labelAlt: 'ДЕНЬ', detail: 'День месяца', documentation: 'Возвращает номер дня месяца', signature: 'DAY(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'MONTH', labelAlt: 'МЕСЯЦ', detail: 'Месяц', documentation: 'Возвращает номер месяца (1-12)', signature: 'MONTH(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'YEAR', labelAlt: 'ГОД', detail: 'Год', documentation: 'Возвращает год из даты', signature: 'YEAR(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'DOW', labelAlt: 'ДЕНЬНЕДЕЛИ', detail: 'День недели', documentation: 'Возвращает номер дня недели', signature: 'DOW(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },

    // Числа
    { label: 'VAL', detail: 'Строка в число', documentation: 'Преобразует строку в числовое значение', signature: 'VAL(Строка)', params: [{ label: 'Строка', documentation: 'Строковое представление числа' }] },
    { label: 'INT', labelAlt: 'ЦЕЛОЕ', detail: 'Целая часть', documentation: 'Возвращает целую часть числа', signature: 'INT(Число)', params: [{ label: 'Число', documentation: 'Число' }] },
    { label: 'ROUND', labelAlt: 'ОКРУГЛИТЬ', detail: 'Округление', documentation: 'Округляет число до указанного количества знаков', signature: 'ROUND(Число, КоличествоЗнаков)', params: [{ label: 'Число', documentation: 'Число для округления' }, { label: 'КоличествоЗнаков', documentation: 'Знаков после запятой (отрицательные — до десятков, сотен...)' }] },
    { label: 'ABS', labelAlt: 'АБСОЛЮТНОЕЗНАЧЕНИЕ', detail: 'Модуль числа', documentation: 'Возвращает абсолютное значение', signature: 'ABS(Число)', params: [{ label: 'Число', documentation: 'Число' }] },
    { label: 'MAX', labelAlt: 'МАКС', detail: 'Максимум', documentation: 'Возвращает максимальное из переданных значений', signature: 'MAX(Выражение1, Выражение2[, ...])', params: [{ label: 'Выражение1', documentation: 'Первое значение' }, { label: 'Выражение2', documentation: 'Второе значение' }] },
    { label: 'MIN', labelAlt: 'МИН', detail: 'Минимум', documentation: 'Возвращает минимальное из переданных значений', signature: 'MIN(Выражение1, Выражение2[, ...])', params: [{ label: 'Выражение1', documentation: 'Первое значение' }, { label: 'Выражение2', documentation: 'Второе значение' }] },
    { label: 'RAND', labelAlt: 'СЛУЧАЙНОЕЧИСЛО', detail: 'Случайное число', documentation: 'Возвращает псевдослучайное число', signature: 'RAND([Параметр])', params: [{ label: 'Параметр', documentation: 'Число — база инициализации генератора (необязательный)' }] },
    { label: 'SIGN', labelAlt: 'ЗНАК', detail: 'Знак числа', documentation: 'Возвращает 1 (положительное), -1 (отрицательное) или 0', signature: 'SIGN(Число)', params: [{ label: 'Число', documentation: 'Число' }] },

    // Логические
    { label: 'IIF', labelAlt: 'ЕСЛИ', detail: 'Тернарная функция', documentation: 'Возвращает одно из двух значений в зависимости от условия', signature: 'IIF(Условие, Выражение1, Выражение2)', params: [{ label: 'Условие', documentation: 'Логическое выражение' }, { label: 'Выражение1', documentation: 'Значение при ИСТИНА' }, { label: 'Выражение2', documentation: 'Значение при ЛОЖЬ' }] },
    { label: 'EMPTY', labelAlt: 'ПУСТО', detail: 'Проверка пустоты', documentation: 'Проверяет, пустое ли значение (пустая строка, 0, пустая дата, ЛОЖЬ)', signature: 'EMPTY(Выражение)', params: [{ label: 'Выражение', documentation: 'Проверяемое выражение' }] },
    { label: 'TYPE', labelAlt: 'ТИП', detail: 'Тип значения', documentation: 'Возвращает тип: U-не вычислено, I-целое, B-вещественное, C-строка, L-логическое, D-дата', signature: 'TYPE(Выражение)', params: [{ label: 'Выражение', documentation: 'Выражение для определения типа' }] },
    { label: 'BETWEEN', labelAlt: 'МЕЖДУ', detail: 'Между значениями', documentation: 'Проверяет, находится ли значение между двумя другими', signature: 'BETWEEN(Выражение1, Выражение2, Выражение3)', params: [{ label: 'Выражение1', documentation: 'Проверяемое значение' }, { label: 'Выражение2', documentation: 'Нижняя граница' }, { label: 'Выражение3', documentation: 'Верхняя граница' }] },
    { label: 'INLIST', labelAlt: 'ВСПИСКЕ', detail: 'Наличие в списке', documentation: 'Проверяет наличие значения в списке', signature: 'INLIST(Выражение, Значение1[, Значение2, ...])', params: [{ label: 'Выражение', documentation: 'Искомое значение' }, { label: 'Значение1,...', documentation: 'Список значений' }] },

    // Данные
    { label: 'QUERY', labelAlt: 'ЗАПРОС', detail: 'SQL запрос', documentation: 'Выполняет SQL запрос и возвращает значение первого поля первой записи', signature: 'QUERY(SQLЗапрос[, Поле[, НомерСоединения]])', params: [{ label: 'SQLЗапрос', documentation: 'Строка SQL запроса' }, { label: 'Поле', documentation: 'Имя поля (необязательный)' }, { label: 'НомерСоединения', documentation: 'Дескриптор соединения (необязательный)' }] },
    { label: 'ADDCONTEXT', labelAlt: 'ДОБАВИТЬКОНТЕКСТ', detail: 'Добавить контекст', documentation: 'Выполняет SQL запрос и создает таблицу контекста для навигации', signature: 'ADDCONTEXT(СтрокаSQL, ИмяКонтекста[, ТекстСообщения[, НомерСоединения]])', params: [{ label: 'СтрокаSQL', documentation: 'SQL запрос или LOCAL: описание полей' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста' }] },
    { label: 'REMOVECONTEXT', labelAlt: 'УДАЛИТЬКОНТЕКСТ', detail: 'Удалить контекст', documentation: 'Удаляет контекст и освобождает ресурсы', signature: 'REMOVECONTEXT(ИмяКонтекста)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя удаляемого контекста' }] },
    { label: 'SELECTCONTEXT', labelAlt: 'ВЫБРАТЬКОНТЕКСТ', detail: 'Выбрать контекст', documentation: 'Устанавливает указанный контекст как текущий', signature: 'SELECTCONTEXT(ИмяКонтекста)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }] },
    { label: 'ENDOFVIEW', labelAlt: 'КОНЕЦКОНТЕКСТА', detail: 'Конец контекста?', documentation: 'Возвращает ИСТИНУ, если указатель строк за пределами последней строки', signature: 'ENDOFVIEW([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'SKIP', labelAlt: 'ПРОПУСТИТЬ', detail: 'Пропустить строки', documentation: 'Переходит на строку, отстоящую от текущей на указанное количество', signature: 'SKIP([КоличествоСтрок[, ИмяКонтекста]])', params: [{ label: 'КоличествоСтрок', documentation: 'Количество строк (по умолчанию 1)' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'GOTOP', labelAlt: 'ПЕРЕЙТИВНАЧАЛО', detail: 'В начало контекста', documentation: 'Переходит на первую строку', signature: 'GOTOP([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'GOBOTTOM', labelAlt: 'ПЕРЕЙТИВКОНЕЦ', detail: 'В конец контекста', documentation: 'Переходит на последнюю строку', signature: 'GOBOTTOM([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'RECCOUNT', labelAlt: 'КОЛИЧЕСТВОСТРОК', detail: 'Количество строк', documentation: 'Возвращает количество строк в контексте', signature: 'RECCOUNT([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'RECNO', labelAlt: 'НОМЕРСТРОКИ', detail: 'Номер строки', documentation: 'Возвращает номер текущей строки', signature: 'RECNO([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'APPEND', labelAlt: 'ДОБАВИТЬСТРОКИ', detail: 'Добавить строки', documentation: 'Добавляет строки в контекст', signature: 'APPEND(КоличествоСтрок[, ИмяКонтекста[, Заполнять]])', params: [{ label: 'КоличествоСтрок', documentation: 'Количество строк (макс 1000)' }] },
    { label: 'GETXML', labelAlt: 'СФОРМИРОВАТЬ_XML', detail: 'Формирование XML', documentation: 'Формирует XML текст по описаниям', signature: 'GETXML([Описание[, ...]])', params: [{ label: 'Описание', documentation: 'XML описание выгрузки' }] },
    { label: 'GETJSON', labelAlt: 'СФОРМИРОВАТЬ_JSON', detail: 'Формирование JSON', documentation: 'Формирует JSON текст по описаниям', signature: 'GETJSON([Описание[, ...]])', params: [{ label: 'Описание', documentation: 'XML описание выгрузки' }] },
    { label: 'JSONFIELD', labelAlt: 'ПОЛЕ_JSON', detail: 'Поле из JSON', documentation: 'Извлекает значение поля из JSON объекта', signature: 'JSONFIELD(JSONТекст, ИмяПоля|ИндексПоля, ЗначениеПоУмолчанию)', params: [{ label: 'JSONТекст', documentation: 'Строка JSON' }, { label: 'ИмяПоля', documentation: 'Имя поля или индекс' }, { label: 'ЗначениеПоУмолчанию', documentation: 'Значение при отсутствии поля' }] },

    // Соединения
    { label: 'ADDCONNECTION', labelAlt: 'ДОБАВИТЬСОЕДИНЕНИЕ', detail: 'Подключение ODBC', documentation: 'Подключение к источнику данных по ODBC', signature: 'ADDCONNECTION(ИмяСоединения|СтрокаСоединения)', params: [{ label: 'ИмяСоединения|СтрокаСоединения', documentation: 'Имя из таблицы или строка подключения ODBC' }] },
    { label: 'BREAKCONNECTION', labelAlt: 'РАЗОРВАТЬСОЕДИНЕНИЕ', detail: 'Разрыв соединения', documentation: 'Завершает соединение ODBC', signature: 'BREAKCONNECTION(ДескрипторСоединения)', params: [{ label: 'ДескрипторСоединения', documentation: 'Дескриптор соединения' }] },
];

// ========================= PROVIDERS =========================

class ItidaCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Check if we're after "Alias." — offer library functions
        const lineText = document.lineAt(position.line).text.substring(0, position.character);
        const dotMatch = lineText.match(/([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)\.\s*([а-яА-ЯёЁa-zA-Z0-9_]*)$/);

        if (dotMatch) {
            const alias = dotMatch[1];
            const libFunctions = libraryStore.getFunctionsByAlias(alias);
            if (libFunctions.length > 0) {
                for (const fn of libFunctions) {
                    const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
                    item.detail = `${fn.library.libalias} — ${fn.groupname}`;
                    const doc = new vscode.MarkdownString();
                    doc.appendCodeblock(fn.signature, 'itida');
                    if (fn.note) {
                        doc.appendMarkdown('\n\n' + fn.note.replace(/\r\n/g, '\n'));
                    }
                    item.documentation = doc;
                    item.insertText = new vscode.SnippetString(
                        fn.params.length > 0 ? `${fn.name}( \${1} )` : `${fn.name}()`
                    );
                    if (fn.isLocal) {
                        item.detail += ' (локальная)';
                    }
                    items.push(item);
                }
                return items;
            }
        }

        // Standard completions: keywords
        for (const kw of KEYWORDS) {
            const item = new vscode.CompletionItem(kw.label, kw.kind);
            item.detail = kw.detail;
            item.documentation = new vscode.MarkdownString(kw.documentation);
            items.push(item);
        }

        // Built-in functions
        for (const fn of BUILTIN_FUNCTIONS) {
            const item = new vscode.CompletionItem(fn.label, vscode.CompletionItemKind.Function);
            item.detail = fn.detail + (fn.labelAlt ? ` (${fn.labelAlt})` : '');
            item.documentation = new vscode.MarkdownString(`${fn.documentation}\n\n\`${fn.signature}\``);
            item.insertText = new vscode.SnippetString(fn.params.length > 0 ? `${fn.label}( \${1} )` : `${fn.label}( )`);
            items.push(item);

            if (fn.labelAlt) {
                const itemAlt = new vscode.CompletionItem(fn.labelAlt, vscode.CompletionItemKind.Function);
                itemAlt.detail = fn.detail + ` (${fn.label})`;
                itemAlt.documentation = new vscode.MarkdownString(`${fn.documentation}\n\n\`${fn.signature}\``);
                itemAlt.insertText = new vscode.SnippetString(fn.params.length > 0 ? `${fn.labelAlt}( \${1} )` : `${fn.labelAlt}( )`);
                items.push(itemAlt);
            }
        }

        // Library aliases as completions (so user can type alias then ".")
        for (const lib of libraryStore.libraries) {
            const item = new vscode.CompletionItem(lib.libalias, vscode.CompletionItemKind.Module);
            item.detail = `Библиотека: ${lib.libname}`;
            item.documentation = new vscode.MarkdownString(
                `Библиотека функций **${lib.libname}**\n\nАлиас: \`${lib.libalias}\`\n\n` +
                (lib.libsystem ? 'Системная библиотека' : 'Пользовательская библиотека')
            );
            // Trigger suggest after dot
            item.command = { command: 'editor.action.triggerSuggest', title: '' };
            items.push(item);
        }

        // Document-defined functions
        const text = document.getText();
        const seen = new Set<string>();

        const funcPattern = /(?:FUNCTION|ФУНКЦИЯ)\s+(?:LOCAL\s+|ЛОКАЛЬНАЯ\s+)?([а-яА-ЯёЁa-zA-Z_]\w*)/gi;
        let match;
        while ((match = funcPattern.exec(text)) !== null) {
            const name = match[1];
            if (!seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
                item.detail = 'Функция документа';
                items.push(item);
            }
        }

        return items;
    }
}

class ItidaHoverProvider implements vscode.HoverProvider {
    private hoverMap: Map<string, { detail: string; documentation: string; signature?: string }>;

    constructor() {
        this.hoverMap = new Map();
        for (const kw of KEYWORDS) {
            this.hoverMap.set(kw.label.toLowerCase(), { detail: kw.detail, documentation: kw.documentation });
        }
        for (const fn of BUILTIN_FUNCTIONS) {
            const entry = { detail: fn.detail, documentation: fn.documentation, signature: fn.signature };
            this.hoverMap.set(fn.label.toLowerCase(), entry);
            if (fn.labelAlt) {
                this.hoverMap.set(fn.labelAlt.toLowerCase(), entry);
            }
        }
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        // Check for library function pattern: Alias.FuncName
        const libRange = document.getWordRangeAtPosition(position, /[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*\.[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*/);
        if (libRange) {
            const fullText = document.getText(libRange);
            const dotIdx = fullText.indexOf('.');
            const alias = fullText.substring(0, dotIdx);
            const funcName = fullText.substring(dotIdx + 1);
            const libFunc = libraryStore.getFunctionByFullName(alias, funcName);
            if (libFunc) {
                const md = new vscode.MarkdownString();
                md.appendCodeblock(libFunc.signature, 'itida');
                md.appendMarkdown(`\n\n**${libFunc.library.libname}** — ${libFunc.groupname}`);
                if (libFunc.isLocal) { md.appendMarkdown(' *(локальная)*'); }
                if (libFunc.note) {
                    md.appendMarkdown('\n\n' + libFunc.note.replace(/\r\n/g, '\n'));
                }
                return new vscode.Hover(md, libRange);
            }
        }

        // Check for library alias hover
        const wordRange = document.getWordRangeAtPosition(position, /[а-яА-ЯёЁa-zA-Z_@][а-яА-ЯёЁa-zA-Z0-9_]*/);
        if (!wordRange) { return undefined; }
        const word = document.getText(wordRange);

        // Check if it's a library alias (followed by a dot)
        const charAfter = position.line < document.lineCount
            ? document.lineAt(position.line).text[wordRange.end.character] : '';
        if (charAfter === '.') {
            const lib = libraryStore.getLibraryByAlias(word);
            if (lib) {
                const funcCount = libraryStore.getFunctionsByAlias(word).length;
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**Библиотека: ${lib.libname}**\n\nАлиас: \`${lib.libalias}\`\n\n`);
                md.appendMarkdown(lib.libsystem ? 'Системная библиотека' : 'Пользовательская библиотека');
                md.appendMarkdown(`\n\nФункций: ${funcCount}`);
                return new vscode.Hover(md, wordRange);
            }
        }

        const info = this.hoverMap.get(word.toLowerCase());
        if (!info) { return undefined; }

        const md = new vscode.MarkdownString();
        if (info.signature) {
            md.appendCodeblock(info.signature, 'itida');
        } else {
            md.appendCodeblock(word, 'itida');
        }
        md.appendMarkdown(`\n\n**${info.detail}**\n\n${info.documentation}`);
        return new vscode.Hover(md, wordRange);
    }
}

class ItidaSignatureHelpProvider implements vscode.SignatureHelpProvider {
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.SignatureHelp | undefined {
        const lineText = document.lineAt(position.line).text.substring(0, position.character);
        let depth = 0;
        let paramIndex = 0;
        let funcEnd = -1;

        for (let i = lineText.length - 1; i >= 0; i--) {
            const ch = lineText[i];
            if (ch === ')') { depth++; }
            else if (ch === '(') {
                if (depth === 0) { funcEnd = i; break; }
                depth--;
            } else if (ch === ',' && depth === 0) { paramIndex++; }
        }
        if (funcEnd < 0) { return undefined; }

        const beforeParen = lineText.substring(0, funcEnd).trimEnd();

        // Try library function pattern: Alias.FuncName
        const libNameMatch = beforeParen.match(/([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)\.([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)$/);
        if (libNameMatch) {
            const libFunc = libraryStore.getFunctionByFullName(libNameMatch[1], libNameMatch[2]);
            if (libFunc && libFunc.params.length > 0) {
                const sig = new vscode.SignatureInformation(libFunc.signature, libFunc.note.replace(/\r\n/g, '\n'));
                sig.parameters = libFunc.params.map(p => new vscode.ParameterInformation(p));
                const help = new vscode.SignatureHelp();
                help.signatures = [sig];
                help.activeSignature = 0;
                help.activeParameter = Math.min(paramIndex, libFunc.params.length - 1);
                return help;
            }
        }

        // Try built-in function
        const nameMatch = beforeParen.match(/([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)$/);
        if (!nameMatch) { return undefined; }

        const funcName = nameMatch[1].toLowerCase();
        const funcInfo = BUILTIN_FUNCTIONS.find(f =>
            f.label.toLowerCase() === funcName || f.labelAlt?.toLowerCase() === funcName
        );
        if (!funcInfo) { return undefined; }

        const sig = new vscode.SignatureInformation(funcInfo.signature, funcInfo.documentation);
        sig.parameters = funcInfo.params.map(p => new vscode.ParameterInformation(p.label, p.documentation));

        const help = new vscode.SignatureHelp();
        help.signatures = [sig];
        help.activeSignature = 0;
        help.activeParameter = Math.min(paramIndex, funcInfo.params.length - 1);
        return help;
    }
}

class ItidaDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const lines = document.getText().split('\n');
        const funcPattern = /^\s*(?:FUNCTION|ФУНКЦИЯ)\s+(?:LOCAL\s+|ЛОКАЛЬНАЯ\s+)?([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)\s*\(/i;

        let currentFunc: { symbol: vscode.DocumentSymbol; braceDepth: number } | null = null;
        let braceDepth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = funcPattern.exec(line);

            if (match) {
                const name = match[1];
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    name, 'Функция', vscode.SymbolKind.Function, range, range
                );
                currentFunc = { symbol, braceDepth };
            }

            for (const ch of line) {
                if (ch === '{') { braceDepth++; }
                else if (ch === '}') {
                    braceDepth--;
                    if (currentFunc && braceDepth <= currentFunc.braceDepth) {
                        currentFunc.symbol.range = new vscode.Range(
                            currentFunc.symbol.range.start.line, 0, i, line.length
                        );
                        symbols.push(currentFunc.symbol);
                        currentFunc = null;
                    }
                }
            }
        }

        if (currentFunc) { symbols.push(currentFunc.symbol); }
        return symbols;
    }
}

// ========================= ACTIVATION =========================

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentSelector = { language: 'itida', scheme: 'file' };

    // Load libraries from configured path
    loadLibraries();

    // Re-load when configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('itida.functionLibraryPath')) {
                loadLibraries();
            }
        })
    );

    // Watch for changes in the library directory
    let libraryWatcher: vscode.FileSystemWatcher | undefined;

    function setupLibraryWatcher(): void {
        if (libraryWatcher) {
            libraryWatcher.dispose();
            libraryWatcher = undefined;
        }
        const libPath = vscode.workspace.getConfiguration('itida').get<string>('functionLibraryPath', '');
        if (libPath) {
            const pattern = new vscode.RelativePattern(vscode.Uri.file(libPath), '**/*.json');
            libraryWatcher = vscode.workspace.createFileSystemWatcher(pattern);
            const reload = () => loadLibraries();
            libraryWatcher.onDidChange(reload);
            libraryWatcher.onDidCreate(reload);
            libraryWatcher.onDidDelete(reload);
            context.subscriptions.push(libraryWatcher);
        }
    }

    setupLibraryWatcher();
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('itida.functionLibraryPath')) {
                setupLibraryWatcher();
            }
        })
    );

    // Reload command
    context.subscriptions.push(
        vscode.commands.registerCommand('itida.reloadLibraries', () => {
            loadLibraries();
            vscode.window.showInformationMessage(
                libraryStore.isEmpty
                    ? 'Айтида: путь к библиотекам не задан (itida.functionLibraryPath)'
                    : `Айтида: загружено ${libraryStore.functions.length} функций из ${libraryStore.libraries.length} библиотек`
            );
        })
    );

    // Register providers
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, new ItidaCompletionProvider(), '.', '('),
        vscode.languages.registerHoverProvider(selector, new ItidaHoverProvider()),
        vscode.languages.registerSignatureHelpProvider(selector, new ItidaSignatureHelpProvider(), '(', ','),
        vscode.languages.registerDocumentSymbolProvider(selector, new ItidaDocumentSymbolProvider()),
    );
}

export function deactivate() {}
