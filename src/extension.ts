import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LibraryStore, generateFunctionJson } from './libraryLoader';

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
    { label: 'STR', labelAlt: 'СТРОКА', detail: 'Число в строку', documentation: 'Преобразует число или двоичный массив в строку указанной длины', signature: 'STR(Число|ДвоичныйМассив[, Длина[, КоличествоЗнаков[, СжиматьПробелы[, УбиратьНули[, СистемаСчисления]]]]])', params: [{ label: 'Число', documentation: 'Число для преобразования или двоичный массив' }, { label: 'Длина', documentation: 'Длина результата (по умолчанию 10)' }, { label: 'КоличествоЗнаков', documentation: 'Знаков после запятой (по умолчанию 0)' }, { label: 'СжиматьПробелы', documentation: 'Логическое (по умолчанию true)' }, { label: 'УбиратьНули', documentation: 'Логическое (по умолчанию false)' }, { label: 'СистемаСчисления', documentation: 'Число от 2 до 36 (по умолчанию 10)' }] },
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
    { label: 'QUERY', labelAlt: 'ЗАПРОС', detail: 'SQL запрос', documentation: 'Выполняет SQL запрос и возвращает значение первого поля первой записи', signature: 'QUERY(SQLЗапрос[, Поле[, НомерСоединения|СписокФилиалов]])', params: [{ label: 'SQLЗапрос', documentation: 'Строка SQL запроса' }, { label: 'Поле', documentation: 'Имя поля (необязательный)' }, { label: 'НомерСоединения|СписокФилиалов', documentation: 'Дескриптор соединения или список филиалов (необязательный)' }] },
    { label: 'ADDCONTEXT', labelAlt: 'ДОБАВИТЬКОНТЕКСТ', detail: 'Добавить контекст', documentation: 'Выполняет SQL запрос и создает таблицу контекста для навигации', signature: 'ADDCONTEXT(СтрокаSQL, ИмяКонтекста[, ТекстСообщения[, НомерСоединения|СписокФилиалов]])', params: [{ label: 'СтрокаSQL', documentation: 'SQL запрос или LOCAL: описание полей' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ТекстСообщения', documentation: 'Текст для отображения при выполнении (необязательный)' }, { label: 'НомерСоединения|СписокФилиалов', documentation: 'Номер соединения или список филиалов (необязательный)' }] },
    { label: 'REMOVECONTEXT', labelAlt: 'УДАЛИТЬКОНТЕКСТ', detail: 'Удалить контекст', documentation: 'Удаляет контекст и освобождает ресурсы', signature: 'REMOVECONTEXT(ИмяКонтекста)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя удаляемого контекста' }] },
    { label: 'SELECTCONTEXT', labelAlt: 'ВЫБРАТЬКОНТЕКСТ', detail: 'Выбрать контекст', documentation: 'Устанавливает указанный контекст как текущий', signature: 'SELECTCONTEXT(ИмяКонтекста)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }] },
    { label: 'ENDOFVIEW', labelAlt: 'КОНЕЦКОНТЕКСТА', detail: 'Конец контекста?', documentation: 'Возвращает ИСТИНУ, если указатель строк за пределами последней строки', signature: 'ENDOFVIEW([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'SKIP', labelAlt: 'ПРОПУСТИТЬ', detail: 'Пропустить строки', documentation: 'Переходит на строку, отстоящую от текущей на указанное количество', signature: 'SKIP([КоличествоСтрок[, ИмяКонтекста]])', params: [{ label: 'КоличествоСтрок', documentation: 'Количество строк (по умолчанию 1)' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'GOTOP', labelAlt: 'ПЕРЕЙТИВНАЧАЛО', detail: 'В начало контекста', documentation: 'Переходит на первую строку', signature: 'GOTOP([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'GOBOTTOM', labelAlt: 'ПЕРЕЙТИВКОНЕЦ', detail: 'В конец контекста', documentation: 'Переходит на последнюю строку', signature: 'GOBOTTOM([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'RECCOUNT', labelAlt: 'КОЛИЧЕСТВОСТРОК', detail: 'Количество строк', documentation: 'Возвращает количество строк в контексте', signature: 'RECCOUNT([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'RECNO', labelAlt: 'НОМЕРСТРОКИ', detail: 'Номер строки', documentation: 'Возвращает номер текущей строки', signature: 'RECNO([ИмяКонтекста])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'APPEND', labelAlt: 'ДОБАВИТЬСТРОКИ', detail: 'Добавить строки', documentation: 'Добавляет строки в контекст. Если Заполнять=ИСТИНА, заполняет значениями переменных', signature: 'APPEND(КоличествоСтрок[, ИмяКонтекста[, Заполнять[, Выражение[, СписокВключаемыхПолей[, СписокИсключаемыхПолей]]]]])', params: [{ label: 'КоличествоСтрок', documentation: 'Количество строк (макс 1000)' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }, { label: 'Заполнять', documentation: 'Логическое — заполнять значениями переменных (необязательный)' }] },
    { label: 'GETXML', labelAlt: 'СФОРМИРОВАТЬ_XML', detail: 'Формирование XML', documentation: 'Формирует XML текст по описаниям', signature: 'GETXML([Описание[, ...]])', params: [{ label: 'Описание', documentation: 'XML описание выгрузки' }] },
    { label: 'GETJSON', labelAlt: 'СФОРМИРОВАТЬ_JSON', detail: 'Формирование JSON', documentation: 'Формирует JSON текст по описаниям', signature: 'GETJSON([Описание[, ...]])', params: [{ label: 'Описание', documentation: 'XML описание выгрузки' }] },
    { label: 'JSONFIELD', labelAlt: 'ПОЛЕ_JSON', detail: 'Поле из JSON', documentation: 'Извлекает значение поля из JSON объекта', signature: 'JSONFIELD(JSONТекст, ИмяПоля|ИндексПоля, ЗначениеПоУмолчанию)', params: [{ label: 'JSONТекст', documentation: 'Строка JSON' }, { label: 'ИмяПоля', documentation: 'Имя поля или индекс' }, { label: 'ЗначениеПоУмолчанию', documentation: 'Значение при отсутствии поля' }] },

    // Соединения
    { label: 'ADDCONNECTION', labelAlt: 'ДОБАВИТЬСОЕДИНЕНИЕ', detail: 'Подключение ODBC', documentation: 'Подключение к источнику данных по ODBC', signature: 'ADDCONNECTION(ИмяСоединения|СтрокаСоединения)', params: [{ label: 'ИмяСоединения|СтрокаСоединения', documentation: 'Имя из таблицы или строка подключения ODBC' }] },
    { label: 'BREAKCONNECTION', labelAlt: 'РАЗОРВАТЬСОЕДИНЕНИЕ', detail: 'Разрыв соединения', documentation: 'Завершает соединение ODBC', signature: 'BREAKCONNECTION(ДескрипторСоединения)', params: [{ label: 'ДескрипторСоединения', documentation: 'Дескриптор соединения' }] },
    { label: 'SELECTCONNECTION', labelAlt: 'ВЫБРАТЬСОЕДИНЕНИЕ', detail: 'Выбрать соединение', documentation: 'Устанавливает указанное соединение соединением по умолчанию', signature: 'SELECTCONNECTION(ДескрипторСоединения)', params: [{ label: 'ДескрипторСоединения', documentation: 'Дескриптор выбираемого соединения' }] },
    { label: 'CONNECTION', labelAlt: 'СОЕДИНЕНИЕ', detail: 'Дескриптор соединения', documentation: 'Возвращает дескриптор указанного соединения с базой данных', signature: 'CONNECTION([НомерСоединения])', params: [{ label: 'НомерСоединения', documentation: 'Номер соединения (необязательный)' }] },

    // Строковые (недостающие)
    { label: 'PADL', labelAlt: 'ДОБАВИТЬПРОБЕЛЫЛЕВ', detail: 'Дополнение пробелами слева', documentation: 'Добавляет пробелы в начало строки до указанной длины', signature: 'PADL(Строка, Длина)', params: [{ label: 'Строка', documentation: 'Исходная строка' }, { label: 'Длина', documentation: 'Требуемая длина результата' }] },
    { label: 'PADR', labelAlt: 'ДОБАВИТЬПРОБЕЛЫПРАВ', detail: 'Дополнение пробелами справа', documentation: 'Добавляет пробелы в конец строки до указанной длины', signature: 'PADR(Строка, Длина)', params: [{ label: 'Строка', documentation: 'Исходная строка' }, { label: 'Длина', documentation: 'Требуемая длина результата' }] },
    { label: 'RAT', labelAlt: 'ОБРАТНЫЙПОИСК', detail: 'Поиск с конца строки', documentation: 'Возвращает позицию символа в строке при поиске с конца', signature: 'RAT(Строка, Символ)', params: [{ label: 'Строка', documentation: 'Строка для поиска' }, { label: 'Символ', documentation: 'Искомый символ или число с кодом символа' }] },
    { label: 'STDA', detail: 'Строка для вычислителя', documentation: 'Преобразует строку для безошибочной передачи вычислителю', signature: 'STDA(Строка, Символ)', params: [{ label: 'Строка', documentation: 'Строка для преобразования' }, { label: 'Символ', documentation: 'Символ, который необходимо заменить' }] },
    { label: 'STDE', detail: 'Строка для файла обмена', documentation: 'Преобразует строку для безошибочной записи в текстовый файл обмена данными', signature: 'STDE(Строка[, Длина])', params: [{ label: 'Строка', documentation: 'Строка для преобразования' }, { label: 'Длина', documentation: 'Максимальная длина (необязательный)' }] },
    { label: 'STRTRANC', detail: 'Замена подстроки (без регистра)', documentation: 'Заменяет вхождения подстроки (без учета регистра)', signature: 'STRTRANC(СтрокаПоиска, ИскомаяСтрока, Замена[, НомерФрагмента[, КоличествоЗамен]])', params: [{ label: 'СтрокаПоиска', documentation: 'Строка для поиска' }, { label: 'ИскомаяСтрока', documentation: 'Что заменить' }, { label: 'Замена', documentation: 'На что заменить' }, { label: 'НомерФрагмента', documentation: 'С какого вхождения начать (необязательный)' }, { label: 'КоличествоЗамен', documentation: 'Сколько замен произвести (необязательный)' }] },
    { label: 'STRINGREAD', labelAlt: 'ПРОЧИТАТЬСТРОКУ', detail: 'Чтение строки из переменной', documentation: 'Возвращает первую строку из значения переменной до разделителя, остаток записывает обратно', signature: 'STRINGREAD(ИмяПеременной[, Разделитель])', params: [{ label: 'ИмяПеременной', documentation: 'Имя переменной с текстом' }, { label: 'Разделитель', documentation: 'Ограничитель строки (необязательный)' }] },
    { label: 'ENVVAR', labelAlt: 'ПОКРУЖЕНИЯ', detail: 'Переменная окружения', documentation: 'Возвращает значение переменной окружения', signature: 'ENVVAR(ИмяПеременнойОкружения)', params: [{ label: 'ИмяПеременнойОкружения', documentation: 'Имя переменной окружения' }] },
    { label: 'TRANSLATENUMBERRUR', labelAlt: 'ПРОПИСЬРУБ', detail: 'Рубли прописью', documentation: 'Возвращает количество рублей прописью', signature: 'TRANSLATENUMBERRUR(Число[, КоличествоЗнаков])', params: [{ label: 'Число', documentation: 'Число рублей' }, { label: 'КоличествоЗнаков', documentation: 'Количество знаков для копеек (необязательный)' }] },
    { label: 'ARRAYTOSTRING', labelAlt: 'СТРОКАИЗМАССИВА', detail: 'Массив в строку', documentation: 'Преобразует массив байт в строку', signature: 'ARRAYTOSTRING(МассивБайт)', params: [{ label: 'МассивБайт', documentation: 'Массив для преобразования' }] },
    { label: 'STRINGTOARRAY', labelAlt: 'МАССИВИЗСТРОКИ', detail: 'Строка в массив', documentation: 'Преобразует строку в массив байт', signature: 'STRINGTOARRAY(Строка)', params: [{ label: 'Строка', documentation: 'Строка для преобразования' }] },
    { label: 'ITEM', labelAlt: 'ЭЛЕМЕНТ', detail: 'Элемент строки/массива', documentation: 'Возвращает или устанавливает элемент строки или массива по индексу', signature: 'ITEM(Строка|Массив, Индекс[, НовоеЗначение])', params: [{ label: 'Строка|Массив', documentation: 'Строка или массив' }, { label: 'Индекс', documentation: 'Индекс элемента' }, { label: 'НовоеЗначение', documentation: 'Новое значение (необязательный)' }] },
    { label: 'ENCRYPTTEXT', labelAlt: 'ЗАШИФРОВАТЬТЕКСТ', detail: 'Шифрование текста', documentation: 'Возвращает зашифрованный текст в BASE64', signature: 'ENCRYPTTEXT(Текст, Ключ)', params: [{ label: 'Текст', documentation: 'Текст для шифрования' }, { label: 'Ключ', documentation: 'Ключ шифрования' }] },
    { label: 'DECRYPTTEXT', labelAlt: 'РАСШИФРОВАТЬТЕКСТ', detail: 'Расшифровка текста', documentation: 'Возвращает расшифрованный текст из BASE64', signature: 'DECRYPTTEXT(Текст, Ключ)', params: [{ label: 'Текст', documentation: 'Зашифрованный текст в base64' }, { label: 'Ключ', documentation: 'Ключ расшифровки' }] },

    // Даты (недостающие)
    { label: 'TTOD', labelAlt: 'ДАТАИЗВРЕМЕНИ', detail: 'ДатаВремя в Дату', documentation: 'Преобразует дату и время в дату без времени', signature: 'TTOD(ДатаВремя)', params: [{ label: 'ДатаВремя', documentation: 'Дата и время для преобразования' }] },
    { label: 'CDOW', labelAlt: 'ИМЯДНЯНЕДЕЛИ', detail: 'Имя дня недели', documentation: 'Возвращает название дня недели по дате или номеру', signature: 'CDOW(Дата|НомерДня)', params: [{ label: 'Дата|НомерДня', documentation: 'Дата или номер дня недели' }] },
    { label: 'GOYEAR', labelAlt: 'ДОБАВИТЬГОДЫ', detail: 'Прибавить годы', documentation: 'Возвращает дату, отстоящую на указанное количество лет', signature: 'GOYEAR(Дата[, КоличествоЛет])', params: [{ label: 'Дата', documentation: 'Исходная дата' }, { label: 'КоличествоЛет', documentation: 'Количество лет (по умолчанию 1)' }] },
    { label: 'HOUR', labelAlt: 'ЧАС', detail: 'Час', documentation: 'Возвращает номер часа (0-23) из даты и времени', signature: 'HOUR(ДатаВремя)', params: [{ label: 'ДатаВремя', documentation: 'Дата и время' }] },
    { label: 'MINUTE', labelAlt: 'МИНУТА', detail: 'Минута', documentation: 'Возвращает значение минут (0-59) из даты и времени', signature: 'MINUTE(ДатаВремя)', params: [{ label: 'ДатаВремя', documentation: 'Дата и время' }] },
    { label: 'SECOND', labelAlt: 'СЕКУНДА', detail: 'Секунда', documentation: 'Возвращает значение секунд (0-59) из даты и времени', signature: 'SECOND(ДатаВремя|Секунды)', params: [{ label: 'ДатаВремя|Секунды', documentation: 'Дата и время или число секунд' }] },
    { label: 'MONTHNAME', labelAlt: 'ИМЯМЕСЯЦА', detail: 'Название месяца', documentation: 'Возвращает название месяца по дате или номеру', signature: 'MONTHNAME(Дата|НомерМесяца[, Падеж])', params: [{ label: 'Дата|НомерМесяца', documentation: 'Дата или номер месяца (1-12)' }, { label: 'Падеж', documentation: '0 - именительный, иначе - родительный (необязательный)' }] },
    { label: 'TIME', labelAlt: 'ВРЕМЯ', detail: 'Текущее время', documentation: 'Возвращает текущее системное время', signature: 'TIME()', params: [] },
    { label: 'WEEK', labelAlt: 'НЕДЕЛЯ', detail: 'Номер недели', documentation: 'Возвращает номер недели в году по дате', signature: 'WEEK(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'QUARTER', labelAlt: 'КВАРТАЛ', detail: 'Квартал', documentation: 'Возвращает номер квартала в году по дате', signature: 'QUARTER(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'MONTHFIRSTDATE', labelAlt: 'НАЧАЛОМЕСЯЦА', detail: 'Начало месяца', documentation: 'Возвращает дату начала месяца для указанной даты', signature: 'MONTHFIRSTDATE(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },
    { label: 'MONTHLASTDATE', labelAlt: 'КОНЕЦМЕСЯЦА', detail: 'Конец месяца', documentation: 'Возвращает дату последнего дня месяца для указанной даты', signature: 'MONTHLASTDATE(Дата)', params: [{ label: 'Дата', documentation: 'Дата' }] },

    // Числа (недостающие)
    { label: 'ACOUNT', labelAlt: 'ЭЛЕМЕНТОВВМАССИВЕ', detail: 'Количество элементов', documentation: 'Возвращает количество элементов в массиве', signature: 'ACOUNT(ИмяМассива)', params: [{ label: 'ИмяМассива', documentation: 'Имя массива (строка в кавычках)' }] },

    // JSON (недостающие)
    { label: 'GETVJSON', labelAlt: 'СФОРМИРОВАТЬ_VJSON', detail: 'JSON из переменных', documentation: 'Формирует JSON из списка переменных', signature: 'GETVJSON(СписокПеременных)', params: [{ label: 'СписокПеременных', documentation: 'Строка с именами переменных через пробел или запятую' }] },
    { label: 'JSONTOVARS', labelAlt: 'РАЗОБРАТЬ_VJSON', detail: 'JSON в переменные', documentation: 'Разбирает JSON и создает переменные с именами полей объекта', signature: 'JSONTOVARS(СтрокаJson[, ИмяПеременной])', params: [{ label: 'СтрокаJson', documentation: 'JSON строка для разбора' }, { label: 'ИмяПеременной', documentation: 'Имя для безымянного массива (необязательный)' }] },
    { label: 'JSONDATA', labelAlt: 'ДАННЫЕ_JSON', detail: 'Данные в JSON', documentation: 'Формирует JSON текст для указанного поля и значения', signature: 'JSONDATA(ИмяПоля, Значение)', params: [{ label: 'ИмяПоля', documentation: 'Имя поля' }, { label: 'Значение', documentation: 'Значение поля' }] },

    // Данные (недостающие)
    { label: 'LOADDATA', labelAlt: 'ЗАГРУЗИТЬДАННЫЕ', detail: 'Загрузка данных', documentation: 'Загружает данные из файла в базу данных по XML описанию', signature: 'LOADDATA(ИмяФайлаОписания, ИмяФайлаДанных)', params: [{ label: 'ИмяФайлаОписания', documentation: 'Файл с XML описанием правил загрузки' }, { label: 'ИмяФайлаДанных', documentation: 'Файл с данными в XML формате' }] },
    { label: 'EXPORTDATA', labelAlt: 'ВЫГРУЗИТЬДАННЫЕ', detail: 'Выгрузка данных', documentation: 'Выгружает данные из базы в файл по шаблону экспорта', signature: 'EXPORTDATA(КодШаблона)', params: [{ label: 'КодШаблона', documentation: 'Код шаблона из справочника экспорта' }] },

    // Контексты (недостающие)
    { label: 'GO', labelAlt: 'ПЕРЕЙТИ', detail: 'Перейти на строку', documentation: 'Переходит на указанную строку в контексте', signature: 'GO(НомерСтроки[, ИмяКонтекста])', params: [{ label: 'НомерСтроки', documentation: 'Номер строки' }, { label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'CREATEINDEX', labelAlt: 'СОЗДАТЬИНДЕКС', detail: 'Создать индекс', documentation: 'Создает файл индекса для контекста', signature: 'CREATEINDEX(ИмяКонтекста, Выражение[, ДлинаКлюча[, Флаги[, ИмяФайла]]])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'Выражение', documentation: 'Индексное выражение' }, { label: 'ДлинаКлюча', documentation: 'Размер ключа (необязательный)' }, { label: 'Флаги', documentation: '1-уникальный, 0-неуникальный (необязательный)' }] },
    { label: 'FIND', labelAlt: 'НАЙТИ', detail: 'Поиск записи', documentation: 'Ищет запись в контексте по выражению или значению поля', signature: 'FIND(ИмяКонтекста, Выражение)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'Выражение', documentation: 'Логическое выражение или ИмяПоля, Значение' }] },
    { label: 'FINDINDEX', labelAlt: 'НАЙТИПОИНДЕКСУ', detail: 'Поиск по индексу', documentation: 'Ищет значение ключа в индексе контекста', signature: 'FINDINDEX(ИмяКонтекста, ЗначениеКлюча[, НомерИндекса])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ЗначениеКлюча', documentation: 'Значение ключа' }, { label: 'НомерИндекса', documentation: 'Номер индекса (необязательный)' }] },
    { label: 'FINDCONTINUE', labelAlt: 'ПРОДОЛЖИТЬПОИСК', detail: 'Продолжить поиск', documentation: 'Продолжает поиск следующей записи, удовлетворяющей условию', signature: 'FINDCONTINUE(ИмяКонтекста)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }] },
    { label: 'REPLACE', labelAlt: 'ИЗМЕНИТЬПОЛЕ', detail: 'Изменить поле', documentation: 'Изменяет значение поля в текущей записи контекста', signature: 'REPLACE(ИмяКонтекста, ИмяПоля|НомерПоля, ЗначениеПоля)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ИмяПоля|НомерПоля', documentation: 'Имя или номер поля' }, { label: 'ЗначениеПоля', documentation: 'Новое значение' }] },
    { label: 'FIELDVALUE', labelAlt: 'ЗНАЧЕНИЕПОЛЯ', detail: 'Значение поля', documentation: 'Возвращает значение поля контекста', signature: 'FIELDVALUE(ИмяКонтекста, ИмяПоля|НомерПоля[, ЗначениеПоУмолчанию])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ИмяПоля|НомерПоля', documentation: 'Имя или номер поля' }, { label: 'ЗначениеПоУмолчанию', documentation: 'Значение при отсутствии поля (необязательный)' }] },
    { label: 'FIELDVALUETYPE', labelAlt: 'ТИПЗНАЧЕНИЯПОЛЯ', detail: 'Тип поля', documentation: 'Возвращает тип значения поля контекста', signature: 'FIELDVALUETYPE(ИмяКонтекста, ИмяПоля|НомерПоля)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ИмяПоля|НомерПоля', documentation: 'Имя или номер поля' }] },
    { label: 'SELECTINDEX', labelAlt: 'ВЫБРАТЬИНДЕКС', detail: 'Выбрать индекс', documentation: 'Устанавливает текущий активный индекс для контекста', signature: 'SELECTINDEX(ИмяКонтекста, НомерИндекса)', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'НомерИндекса', documentation: 'Номер индекса' }] },
    { label: 'UPLOAD', labelAlt: 'ЗАГРУЗИТЬ', detail: 'Загрузить в контекст', documentation: 'Загружает данные в контекст из CSV, XML, XMLSTRING или JSON', signature: 'UPLOAD(ИмяКонтекста, ТипИсточника, Источник[, Параметр1[, Параметр2]])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'ТипИсточника', documentation: 'CSV, XML, XMLSTRING или JSON' }, { label: 'Источник', documentation: 'Имя файла или строка данных' }] },
    { label: 'DOWNLOAD', labelAlt: 'ВЫГРУЗИТЬ', detail: 'Выгрузить из контекста', documentation: 'Выгружает данные из контекста в таблицу БД', signature: 'DOWNLOAD(ИмяТаблицы[, СписокПолей[, СписокИсключений[, ИмяКонтекста[, НомерСоединения]]]])', params: [{ label: 'ИмяТаблицы', documentation: 'Имя таблицы в БД' }, { label: 'СписокПолей', documentation: 'Список полей (необязательный)' }] },
    { label: 'UPLOADJSON', labelAlt: 'ЗАГРУЗИТЬJSON', detail: 'JSON в контекст', documentation: 'Загружает данные из JSON строки в контекст', signature: 'UPLOADJSON(ИмяКонтекста, СтрокаJSON[, ИмяПоля])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста' }, { label: 'СтрокаJSON', documentation: 'JSON строка' }, { label: 'ИмяПоля', documentation: 'Имя для безымянных полей (необязательный)' }] },
    { label: 'CONTEXTNAME', labelAlt: 'ИМЯКОНТЕКСТА', detail: 'Имя контекста', documentation: 'Возвращает имя текущего выбранного контекста', signature: 'CONTEXTNAME()', params: [] },
    { label: 'LOADRECORD', labelAlt: 'ЧИТАТЬЗАПИСЬ', detail: 'Чтение записи', documentation: 'Загружает значения полей контекста в переменные с соответствующими именами', signature: 'LOADRECORD([ИмяКонтекста[, СписокВключаемыхПолей[, СписокИсключаемыхПолей]]])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },
    { label: 'GATHERRECORD', labelAlt: 'ЗАГРУЗИТЬЗАПИСЬ', detail: 'Запись из переменных', documentation: 'Загружает значения переменных в поля контекста с соответствующими именами', signature: 'GATHERRECORD([ИмяКонтекста[, СписокВключаемыхПолей[, СписокИсключаемыхПолей]]])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста (необязательный)' }] },

    // Таблицы (DBF)
    { label: 'TABLECREATE', labelAlt: 'ТАБЛИЦАСОЗДАТЬ', detail: 'Создать таблицу', documentation: 'Создает файл таблицы в формате DBF', signature: 'TABLECREATE(ИмяФайла, ОписаниеСтруктуры[, Флаги[, Версия]])', params: [{ label: 'ИмяФайла', documentation: 'Полное имя файла' }, { label: 'ОписаниеСтруктуры', documentation: 'Поля: field1 C(50), field2 N(10,3), field3 M, field4 D, field5 I, field6 F' }, { label: 'Флаги', documentation: '0-перезаписать, 1-не перезаписывать (необязательный)' }, { label: 'Версия', documentation: '3-DBase III+, 4-DBase IV (необязательный)' }] },
    { label: 'TABLECREATEINDEX', labelAlt: 'ТАБЛИЦАСОЗДАТЬИНДЕКС', detail: 'Создать индекс таблицы', documentation: 'Создает файл индекса для таблицы', signature: 'TABLECREATEINDEX(НомерТаблицы, Выражение[, ИмяФайлаИндекса[, Флаги]])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'Выражение', documentation: 'Индексное выражение' }] },
    { label: 'TABLEOPEN', labelAlt: 'ТАБЛИЦАОТКРЫТЬ', detail: 'Открыть таблицу', documentation: 'Открывает существующий файл DBF', signature: 'TABLEOPEN(ИмяФайлаТаблицы)', params: [{ label: 'ИмяФайлаТаблицы', documentation: 'Полное имя файла' }] },
    { label: 'TABLEOPENINDEX', labelAlt: 'ТАБЛИЦАОТКРЫТЬИНДЕКС', detail: 'Открыть индекс таблицы', documentation: 'Открывает существующий файл индекса для таблицы', signature: 'TABLEOPENINDEX(НомерТаблицы, ИмяФайлаИндекса)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'ИмяФайлаИндекса', documentation: 'Полное имя файла индекса' }] },
    { label: 'TABLECLOSE', labelAlt: 'ТАБЛИЦАЗАКРЫТЬ', detail: 'Закрыть таблицу', documentation: 'Закрывает таблицу и освобождает ресурсы', signature: 'TABLECLOSE(НомерТаблицы[, Флаг])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'Флаг', documentation: '1-удалить файлы (необязательный)' }] },
    { label: 'TABLECLOSEINDEX', labelAlt: 'ТАБЛИЦАЗАКРЫТЬИНДЕКС', detail: 'Закрыть индекс таблицы', documentation: 'Закрывает индекс и освобождает ресурсы', signature: 'TABLECLOSEINDEX(НомерИндекса[, Флаг])', params: [{ label: 'НомерИндекса', documentation: 'Номер индекса' }, { label: 'Флаг', documentation: '1-удалить файл (необязательный)' }] },
    { label: 'TABLEGOTO', labelAlt: 'ТАБЛИЦАПЕРЕЙТИ', detail: 'Перейти в таблице', documentation: 'Позиционирует указатель на указанной записи таблицы', signature: 'TABLEGOTO(НомерТаблицы, НомерЗаписи)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'НомерЗаписи', documentation: 'Номер записи' }] },
    { label: 'TABLEGOTOP', labelAlt: 'ТАБЛИЦАПЕРЕЙТИВНАЧАЛО', detail: 'В начало таблицы', documentation: 'Переходит на первую запись таблицы', signature: 'TABLEGOTOP(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEGOBOTTOM', labelAlt: 'ТАБЛИЦАПЕРЕЙТИВКОНЕЦ', detail: 'В конец таблицы', documentation: 'Переходит на последнюю запись таблицы', signature: 'TABLEGOBOTTOM(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLESKIP', labelAlt: 'ТАБЛИЦАПРОПУСТИТЬ', detail: 'Пропустить записи таблицы', documentation: 'Переходит на запись, отстоящую на указанное количество', signature: 'TABLESKIP(НомерТаблицы[, КоличествоЗаписей])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'КоличествоЗаписей', documentation: 'Количество записей (по умолчанию 1)' }] },
    { label: 'TABLEEOF', labelAlt: 'ТАБЛИЦАКОНЕЦФАЙЛА', detail: 'Конец таблицы?', documentation: 'Проверяет, находится ли указатель за последней записью', signature: 'TABLEEOF(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEAPPEND', labelAlt: 'ТАБЛИЦАДОБАВИТЬЗАПИСЬ', detail: 'Добавить запись в таблицу', documentation: 'Добавляет запись в таблицу и устанавливает значения полей', signature: 'TABLEAPPEND(НомерТаблицы[, СписокПолей])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'СписокПолей', documentation: 'Поля для заполнения (необязательный)' }] },
    { label: 'TABLEREPLACE', labelAlt: 'ТАБЛИЦАИЗМЕНИТЬПОЛЕ', detail: 'Изменить поле таблицы', documentation: 'Изменяет значение поля в текущей записи таблицы', signature: 'TABLEREPLACE(НомерТаблицы, ИмяПоля|НомерПоля, Значение)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'ИмяПоля|НомерПоля', documentation: 'Имя или номер поля' }, { label: 'Значение', documentation: 'Новое значение' }] },
    { label: 'TABLEUPDATE', labelAlt: 'ТАБЛИЦАОБНОВИТЬЗАПИСЬ', detail: 'Обновить запись таблицы', documentation: 'Обновляет привязанные поля значениями переменных', signature: 'TABLEUPDATE(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEDELETE', labelAlt: 'ТАБЛИЦАУДАЛИТЬЗАПИСЬ', detail: 'Удалить запись таблицы', documentation: 'Помечает на удаление записи в таблице', signature: 'TABLEDELETE(НомерТаблицы[, НомерЗаписи|Выражение])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'НомерЗаписи|Выражение', documentation: 'Номер записи или выражение (необязательный)' }] },
    { label: 'TABLEFIND', labelAlt: 'ТАБЛИЦАНАЙТИ', detail: 'Поиск в таблице', documentation: 'Ищет запись в таблице по выражению', signature: 'TABLEFIND(НомерТаблицы, Выражение)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'Выражение', documentation: 'Логическое выражение' }] },
    { label: 'TABLEFINDINDEX', labelAlt: 'ТАБЛИЦАНАЙТИПОИНДЕКСУ', detail: 'Поиск в таблице по индексу', documentation: 'Ищет значение ключа в индексе таблицы', signature: 'TABLEFINDINDEX(НомерТаблицы, ЗначениеКлюча[, НомерИндекса])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'ЗначениеКлюча', documentation: 'Значение ключа' }, { label: 'НомерИндекса', documentation: 'Номер индекса (необязательный)' }] },
    { label: 'TABLEFINDCONTINUE', labelAlt: 'ТАБЛИЦАПРОДОЛЖИТЬПОИСК', detail: 'Продолжить поиск в таблице', documentation: 'Продолжает поиск следующей записи в таблице', signature: 'TABLEFINDCONTINUE(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEINDEX', labelAlt: 'ТАБЛИЦАВЫБРАТЬИНДЕКС', detail: 'Выбрать индекс таблицы', documentation: 'Устанавливает текущий активный индекс таблицы', signature: 'TABLEINDEX(НомерТаблицы, НомерИндекса)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'НомерИндекса', documentation: 'Номер индекса' }] },
    { label: 'TABLERECCOUNT', labelAlt: 'ТАБЛИЦАКОЛИЧЕСТВОЗАПИСЕЙ', detail: 'Кол-во записей таблицы', documentation: 'Возвращает количество записей в таблице', signature: 'TABLERECCOUNT(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLERECNO', labelAlt: 'ТАБЛИЦАНОМЕРЗАПИСИ', detail: 'Номер записи таблицы', documentation: 'Возвращает номер текущей записи в таблице', signature: 'TABLERECNO(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEFIELD', labelAlt: 'ТАБЛИЦАЗНАЧЕНИЕПОЛЯ', detail: 'Значение поля таблицы', documentation: 'Возвращает значение поля в текущей записи таблицы', signature: 'TABLEFIELD(НомерТаблицы, НомерПоля|ИмяПоля)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'НомерПоля|ИмяПоля', documentation: 'Номер или имя поля' }] },
    { label: 'TABLELOADRECORD', labelAlt: 'ТАБЛИЦАЧИТАТЬЗАПИСЬ', detail: 'Чтение записи таблицы', documentation: 'Загружает поля таблицы в переменные с соответствующими именами', signature: 'TABLELOADRECORD(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEBIND', labelAlt: 'ТАБЛИЦАПРИВЯЗАТЬПОЛЯ', detail: 'Привязка полей таблицы', documentation: 'Привязывает поля таблицы к переменным для автоматического обновления', signature: 'TABLEBIND(НомерТаблицы, СписокПолей)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'СписокПолей', documentation: 'Список полей через запятую (* — все поля)' }] },
    { label: 'TABLEDROP', labelAlt: 'ТАБЛИЦАУДАЛИТЬФАЙЛ', detail: 'Удалить файл таблицы', documentation: 'Закрывает таблицу и удаляет все связанные файлы', signature: 'TABLEDROP(НомерТаблицы)', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }] },
    { label: 'TABLEUPLOAD', labelAlt: 'ТАБЛИЦАЗАГРУЗИТЬ', detail: 'Загрузить в таблицу', documentation: 'Загружает данные в таблицу из CSV, DBF, XML или SQL', signature: 'TABLEUPLOAD(НомерТаблицы, ТипИсточника, Источник[, Параметр1[, Параметр2]])', params: [{ label: 'НомерТаблицы', documentation: 'Номер таблицы' }, { label: 'ТипИсточника', documentation: 'CSV, DBF, XML или SQL' }, { label: 'Источник', documentation: 'Имя файла или SQL запрос' }] },

    // Системные
    { label: 'ADDMESSAGE', labelAlt: 'ДОБАВИТЬСООБЩЕНИЕ', detail: 'Добавить сообщение', documentation: 'Добавляет сообщение в журнал ошибок (errorlog)', signature: 'ADDMESSAGE(КодСообщения[, ТекстСообщения])', params: [{ label: 'КодСообщения', documentation: 'Код: W-предупреждение, E-ошибка' }, { label: 'ТекстСообщения', documentation: 'Текст сообщения (необязательный)' }] },
    { label: 'CONSTANTSDATE', labelAlt: 'ДАТАКОНСТАНТ', detail: 'Дата констант', documentation: 'Устанавливает дату для определения значений периодических констант', signature: 'CONSTANTSDATE([Дата])', params: [{ label: 'Дата', documentation: 'Дата для констант (необязательный, по умолчанию текущая)' }] },
    { label: 'EVALUATE', labelAlt: 'ВЫЧИСЛИТЬ', detail: 'Вычислить выражение', documentation: 'Выполняет набор команд, переданный в виде строки', signature: 'EVALUATE(Программа[, ТипЗначения[, ЗначениеПоУмолчанию]])', params: [{ label: 'Программа', documentation: 'Текст программы для выполнения' }, { label: 'ТипЗначения', documentation: 'C-строка, I-целое, F/B-вещественное, L-логическое, D-дата (необязательный)' }, { label: 'ЗначениеПоУмолчанию', documentation: 'Значение при ошибке (необязательный)' }] },
    { label: 'VARIABLE', labelAlt: 'ПЕРЕМЕННАЯ', detail: 'Значение переменной', documentation: 'Возвращает значение переменной, константы или понятия без ошибок', signature: 'VARIABLE(ИмяПеременной[, ЗначениеПоУмолчанию])', params: [{ label: 'ИмяПеременной', documentation: 'Имя переменной' }, { label: 'ЗначениеПоУмолчанию', documentation: 'Значение при отсутствии (необязательный)' }] },
    { label: 'MESSAGEBOX', labelAlt: 'СООБЩЕНИЕ', detail: 'Диалоговое окно', documentation: 'Выводит диалоговое окно с сообщением и кнопками', signature: 'MESSAGEBOX([ТекстСообщения[, Заголовок[, Флаги]]])', params: [{ label: 'ТекстСообщения', documentation: 'Текст сообщения' }, { label: 'Заголовок', documentation: 'Заголовок окна (необязательный)' }, { label: 'Флаги', documentation: '0-OK, 1-OK/Отмена, 3-Да/Нет/Отмена, 4-Да/Нет (необязательный)' }] },
    { label: 'PROGRESSBAR', labelAlt: 'ИНДИКАТОР', detail: 'Индикатор прогресса', documentation: 'Выводит и управляет индикатором хода выполнения работы', signature: 'PROGRESSBAR([Заголовок|Индикатор[, База|Подзаголовок[, Подзаголовок|Заголовок]]])', params: [{ label: 'Заголовок|Индикатор', documentation: 'Строка-заголовок (инициализация) или число (обновление)' }, { label: 'База|Подзаголовок', documentation: 'Число-база 100% или строка-подзаголовок' }] },
    { label: 'SYSTEMMESSAGE', labelAlt: 'СИСТЕМНОЕСООБЩЕНИЕ', detail: 'Системное сообщение', documentation: 'Выводит окно с системным сообщением в правом верхнем углу', signature: 'SYSTEMMESSAGE([ТекстСообщения])', params: [{ label: 'ТекстСообщения', documentation: 'Текст (пусто — убрать окно)' }] },
    { label: 'UNIQUENAME', labelAlt: 'УНИКАЛЬНОЕИМЯ', detail: 'Уникальное имя', documentation: 'Генерирует уникальную строку для использования в качестве имени', signature: 'UNIQUENAME()', params: [] },
    { label: 'SENDMESSAGE', labelAlt: 'ОТПРАВИТЬСООБЩЕНИЕ', detail: 'Отправить сообщение окну', documentation: 'Посылает сообщение окну (синхронный вызов SendMessage)', signature: 'SENDMESSAGE(ДескрипторОкна, Сообщение[, wParam[, lParam]])', params: [{ label: 'ДескрипторОкна', documentation: 'Дескриптор окна' }, { label: 'Сообщение', documentation: 'Код сообщения' }, { label: 'wParam', documentation: 'Первый параметр (необязательный)' }, { label: 'lParam', documentation: 'Второй параметр (необязательный)' }] },
    { label: 'POSTMESSAGE', labelAlt: 'ПОСЛАТЬСООБЩЕНИЕ', detail: 'Послать сообщение окну', documentation: 'Отправляет сообщение окну (асинхронный вызов PostMessage)', signature: 'POSTMESSAGE(ДескрипторОкна, Сообщение[, wParam[, lParam]])', params: [{ label: 'ДескрипторОкна', documentation: 'Дескриптор окна' }, { label: 'Сообщение', documentation: 'Код сообщения' }, { label: 'wParam', documentation: 'Первый параметр (необязательный)' }, { label: 'lParam', documentation: 'Второй параметр (необязательный)' }] },
    { label: 'CREATEOBJECT', labelAlt: 'СОЗДАТЬОБЪЕКТ', detail: 'Создать COM объект', documentation: 'Создает экземпляр COM объекта и возвращает ссылку на IDispatch', signature: 'CREATEOBJECT(ИмяКласса[, КонтекстИсполнения])', params: [{ label: 'ИмяКласса', documentation: 'Имя класса из реестра Windows' }, { label: 'КонтекстИсполнения', documentation: 'Контекст: 1-INPROC, 4-LOCAL, 16-REMOTE (необязательный)' }] },
    { label: 'SHELLEXECUTE', labelAlt: 'ВЫПОЛНИТЬ', detail: 'Запуск файла', documentation: 'Запускает файл на выполнение (exe, документы и др.)', signature: 'SHELLEXECUTE(ИмяФайла[, Параметры[, РабочийКаталог[, Действие[, Флаги]]]])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла' }, { label: 'Параметры', documentation: 'Параметры запуска (необязательный)' }, { label: 'РабочийКаталог', documentation: 'Рабочий каталог (необязательный)' }, { label: 'Действие', documentation: 'open, print, edit (необязательный)' }, { label: 'Флаги', documentation: '0-показать, 1-скрыть, 2-показать+ждать, 3-скрыть+ждать (необязательный)' }] },
    { label: 'MESSAGELOG', labelAlt: 'ЖУРНАЛСООБЩЕНИЙ', detail: 'Настройка журнала', documentation: 'Устанавливает параметры ведения журнала ошибок и сообщений', signature: 'MESSAGELOG(ИмяФайла[, ЗаписыватьВБазу[, Флаги[, КоличествоСообщений]]])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла журнала' }, { label: 'ЗаписыватьВБазу', documentation: 'Логическое (необязательный)' }, { label: 'Флаги', documentation: '1-без сист.предупр., 2-без предупр., 4-без SQL ошибок, 8-без ошибок (необязательный)' }] },
    { label: 'FORMAT', labelAlt: 'ФОРМАТ', detail: 'Форматирование строки', documentation: 'Возвращает строку, отформатированную по шаблону', signature: 'FORMAT(СтрокаФормата[, Параметр1[, ...]])', params: [{ label: 'СтрокаФормата', documentation: 'Шаблон форматирования' }, { label: 'Параметр1,...', documentation: 'Параметры для подстановки' }] },
    { label: 'ISSYMBOL', labelAlt: 'ЯВЛЯЕТСЯСИМВОЛОМ', detail: 'Проверка символа', documentation: 'Проверяет, является ли символ допустимым в идентификаторах (буква, _, #, @)', signature: 'ISSYMBOL(Строка[, НомерСимвола])', params: [{ label: 'Строка', documentation: 'Строка с символом' }, { label: 'НомерСимвола', documentation: 'Номер символа (необязательный)' }] },
    { label: 'ISDIGIT', labelAlt: 'ЯВЛЯЕТСЯЦИФРОЙ', detail: 'Проверка цифры', documentation: 'Проверяет, является ли указанный символ цифрой', signature: 'ISDIGIT(Строка[, НомерСимвола])', params: [{ label: 'Строка', documentation: 'Строка с символом' }, { label: 'НомерСимвола', documentation: 'Номер символа (необязательный)' }] },
    { label: 'ISIDENTIFIER', labelAlt: 'ЯВЛЯЕТСЯИДЕНТИФИКАТОРОМ', detail: 'Проверка идентификатора', documentation: 'Проверяет, может ли строка быть идентификатором', signature: 'ISIDENTIFIER(Строка)', params: [{ label: 'Строка', documentation: 'Строка для проверки' }] },
    { label: 'THREAD', labelAlt: 'ПОТОК', detail: 'Выполнение в потоке', documentation: 'Вычисляет выражение в отдельном потоке', signature: 'THREAD(Выражение, Ожидать[, ВремяОжидания[, Сообщение[, ИмяПеременной1[, ...]]]])', params: [{ label: 'Выражение', documentation: 'Текст выражения для вычисления' }, { label: 'Ожидать', documentation: 'Логическое — ждать окончания' }, { label: 'ВремяОжидания', documentation: 'Миллисекунды (необязательный)' }, { label: 'Сообщение', documentation: 'Текст окна ожидания (необязательный)' }] },
    { label: 'PROCESSEVENTS', labelAlt: 'ОБРАБОТАТЬСОБЫТИЯ', detail: 'Обработка событий', documentation: 'Обрабатывает очередь сообщений Windows', signature: 'PROCESSEVENTS()', params: [] },
    { label: 'TICKCOUNT', labelAlt: 'СИСТЕМНОЕВРЕМЯ', detail: 'Время работы системы', documentation: 'Возвращает количество миллисекунд после запуска ОС', signature: 'TICKCOUNT()', params: [] },
    { label: 'CREATEFORM', labelAlt: 'ФОРМА', detail: 'Создать форму', documentation: 'Создает экземпляр формы и возвращает ссылку на объект', signature: 'CREATEFORM(ИДФормы, СписокФилиалов[, Параметр1[, ...]])', params: [{ label: 'ИДФормы', documentation: 'Идентификатор шаблона формы' }, { label: 'СписокФилиалов', documentation: 'Список кодов филиалов' }] },
    { label: 'PDF417', labelAlt: 'СФОРМИРОВАТЬ_PDF417', detail: 'Штрихкод PDF417', documentation: 'Формирует 2D штрихкод в формате PDF417', signature: 'PDF417(Текст, ТипРезультата[, УровеньКоррекции[, КоличествоСтолбцов]])', params: [{ label: 'Текст', documentation: 'Строка для кодирования' }, { label: 'ТипРезультата', documentation: 'B-массив, S-строка для шрифта' }] },
    { label: 'MD5', labelAlt: 'МД5', detail: 'Хэш MD5', documentation: 'Возвращает MD5 хэш строки', signature: 'MD5(Строка[, Тип])', params: [{ label: 'Строка', documentation: 'Строка для хэширования' }, { label: 'Тип', documentation: 'B-массив, S-строка (необязательный)' }] },
    { label: 'SHA256', labelAlt: 'ХЭШ256', detail: 'Хэш SHA256', documentation: 'Вычисляет SHA256 хэш данных', signature: 'SHA256(Данные[, Тип])', params: [{ label: 'Данные', documentation: 'Данные для хэширования' }, { label: 'Тип', documentation: 'B-массив, S-строка BASE64 (необязательный)' }] },
    { label: 'UUID', labelAlt: 'УУИД', detail: 'Генерация UUID', documentation: 'Генерирует новый уникальный универсальный идентификатор', signature: 'UUID()', params: [] },
    { label: 'CRYPTOGRAPHY', labelAlt: 'ШИФРОВАНИЕ', detail: 'Криптография', documentation: 'Выполняет криптографическую операцию (ЭЦП, шифрование) с сертификатом', signature: 'CRYPTOGRAPHY(Сертификат, Данные, Операция[, ОткрепленнаяПодпись[, ОригиналДанных[, Хранилище]]])', params: [{ label: 'Сертификат', documentation: 'Идентификатор сертификата' }, { label: 'Данные', documentation: 'Строка или массив данных' }, { label: 'Операция', documentation: '1-подпись, 2-шифровать, 3-подпись+шифровать, 4-проверить, 5-расшифровать, 6-расшифровать+проверить, 7-дамп' }] },
    { label: 'CERTIFICATES', labelAlt: 'СПИСОКСЕРТИФИКАТОВ', detail: 'Список сертификатов', documentation: 'Заполняет контекст списком сертификатов из хранилища', signature: 'CERTIFICATES(ИмяКонтекста[, Хранилище])', params: [{ label: 'ИмяКонтекста', documentation: 'Имя контекста для результата' }, { label: 'Хранилище', documentation: 'MY, ROOT, CA или SPC (необязательный)' }] },
    { label: 'DEBUGGER', labelAlt: 'ОТЛАДЧИК', detail: 'Отладчик', documentation: 'Подключает отладчик к вычислителю', signature: 'DEBUGGER([IPАдрес[, НомерПорта[, ИмяФайлаЖурнала]]])', params: [{ label: 'IPАдрес', documentation: 'IP адрес отладчика (необязательный)' }, { label: 'НомерПорта', documentation: 'Порт (необязательный)' }] },

    // Сокеты
    { label: 'SOCKETCONNECT', labelAlt: 'СОКЕТСОЕДИНИТЬ', detail: 'Соединение через сокет', documentation: 'Выполняет TCP соединение с сервером', signature: 'SOCKETCONNECT(ИмяСервера|IP[, Порт[, ВестиЖурнал]])', params: [{ label: 'ИмяСервера|IP', documentation: 'Имя сервера или IP адрес' }, { label: 'Порт', documentation: 'Номер порта (необязательный)' }] },
    { label: 'SOCKETSEND', labelAlt: 'СОКЕТПЕРЕДАТЬ', detail: 'Отправить через сокет', documentation: 'Передает данные через сокет', signature: 'SOCKETSEND(Соединение, Данные[, КоличествоБайт])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Данные', documentation: 'Данные для передачи' }] },
    { label: 'SOCKETRECIEVE', labelAlt: 'СОКЕТПОЛУЧИТЬ', detail: 'Получить через сокет', documentation: 'Получает данные через сокет', signature: 'SOCKETRECIEVE(Соединение, КоличествоБайт|Ограничители[, ТипДанных[, ВремяОжидания]])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'КоличествоБайт|Ограничители', documentation: 'Число байт или строка-ограничитель' }] },
    { label: 'SOCKETCLOSE', labelAlt: 'СОКЕТЗАКРЫТЬ', detail: 'Закрыть сокет', documentation: 'Закрывает соединение через сокет', signature: 'SOCKETCLOSE(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },

    // FTP
    { label: 'FTPCONNECT', labelAlt: 'ФТПСОЕДИНИТЬ', detail: 'FTP соединение', documentation: 'Выполняет соединение с FTP сервером', signature: 'FTPCONNECT(ИмяСервера|IP, ИмяПользователя, Пароль[, ПассивныйРежим[, Порт]])', params: [{ label: 'ИмяСервера|IP', documentation: 'Имя или IP сервера' }, { label: 'ИмяПользователя', documentation: 'Логин' }, { label: 'Пароль', documentation: 'Пароль' }] },
    { label: 'FTPCLOSE', labelAlt: 'ФТПЗАКРЫТЬ', detail: 'Закрыть FTP', documentation: 'Закрывает FTP соединение', signature: 'FTPCLOSE(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'FTPPUTFILE', labelAlt: 'ФТППЕРЕДАТЬФАЙЛ', detail: 'Отправить файл FTP', documentation: 'Передает файл на FTP сервер', signature: 'FTPPUTFILE(Соединение, ИмяЛокальногоФайла, ИмяУдаленногоФайла)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ИмяЛокальногоФайла', documentation: 'Локальный файл' }, { label: 'ИмяУдаленногоФайла', documentation: 'Удаленный файл' }] },
    { label: 'FTPGETFILE', labelAlt: 'ФТППОЛУЧИТЬФАЙЛ', detail: 'Получить файл FTP', documentation: 'Скачивает файл с FTP сервера', signature: 'FTPGETFILE(Соединение, ИмяУдаленногоФайла, ИмяЛокальногоФайла)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ИмяУдаленногоФайла', documentation: 'Удаленный файл' }, { label: 'ИмяЛокальногоФайла', documentation: 'Локальный файл' }] },
    { label: 'FTPGETFILEBYTEMPLATE', labelAlt: 'ФТППОЛУЧИТЬФАЙЛПОШАБЛОНУ', detail: 'Получить файлы FTP по шаблону', documentation: 'Скачивает файлы по шаблону с FTP сервера', signature: 'FTPGETFILEBYTEMPLATE(Соединение, Шаблон, ЛокальнаяПапка)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Шаблон', documentation: 'Шаблон имени файла' }, { label: 'ЛокальнаяПапка', documentation: 'Локальная папка' }] },
    { label: 'FTPDELETEFILE', labelAlt: 'ФТПУДАЛИТЬФАЙЛ', detail: 'Удалить файл FTP', documentation: 'Удаляет файл на FTP сервере', signature: 'FTPDELETEFILE(Соединение, ШаблонИмениФайла)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ШаблонИмениФайла', documentation: 'Шаблон имени' }] },
    { label: 'FTPFILESCOUNT', labelAlt: 'ФТПКОЛИЧЕСТВОФАЙЛОВ', detail: 'Кол-во файлов FTP', documentation: 'Возвращает количество файлов на FTP сервере', signature: 'FTPFILESCOUNT(Соединение[, ШаблонИмен])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'FTPSETCURRENTDIR', labelAlt: 'ФТПУСТАНОВИТЬКАТАЛОГ', detail: 'Сменить каталог FTP', documentation: 'Устанавливает текущий каталог на FTP', signature: 'FTPSETCURRENTDIR(Соединение, ИмяКаталога)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ИмяКаталога', documentation: 'Имя каталога' }] },
    { label: 'FTPGETCURRENTDIR', labelAlt: 'ФТПТЕКУЩИЙКАТАЛОГ', detail: 'Текущий каталог FTP', documentation: 'Возвращает текущий каталог на FTP', signature: 'FTPGETCURRENTDIR(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'FTPERROR', labelAlt: 'ФТПОШИБКА', detail: 'Код ошибки FTP', documentation: 'Возвращает код последней ошибки FTP', signature: 'FTPERROR(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'FTPERRORTEXT', labelAlt: 'ФТПТЕКСТОШИБКИ', detail: 'Текст ошибки FTP', documentation: 'Возвращает текст последней ошибки FTP', signature: 'FTPERRORTEXT(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'FTPCREATEDIRECTORY', labelAlt: 'ФТПСОЗДАТЬКАТАЛОГ', detail: 'Создать каталог FTP', documentation: 'Создает каталог на FTP сервере', signature: 'FTPCREATEDIRECTORY(Соединение, ИмяКаталога)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ИмяКаталога', documentation: 'Имя каталога' }] },
    { label: 'FTPDELETEDIRECTORY', labelAlt: 'ФТПУДАЛИТЬКАТАЛОГ', detail: 'Удалить каталог FTP', documentation: 'Удаляет каталог на FTP сервере', signature: 'FTPDELETEDIRECTORY(Соединение, ИмяКаталога)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ИмяКаталога', documentation: 'Имя каталога' }] },

    // HTTP
    { label: 'HTTPCONNECT', labelAlt: 'HTTPСОЕДИНИТЬ', detail: 'HTTP соединение', documentation: 'Выполняет HTTP(S) соединение с сервером', signature: 'HTTPCONNECT(ИмяСервера|IP[, Порт[, Защищенное[, ФайлЖурнала]]])', params: [{ label: 'ИмяСервера|IP', documentation: 'Имя или IP сервера' }, { label: 'Порт', documentation: 'Номер порта (необязательный)' }, { label: 'Защищенное', documentation: 'HTTPS (необязательный)' }] },
    { label: 'HTTPCLOSE', labelAlt: 'HTTPЗАКРЫТЬ', detail: 'Закрыть HTTP', documentation: 'Закрывает HTTP соединение', signature: 'HTTPCLOSE(Соединение)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }] },
    { label: 'HTTPGET', labelAlt: 'HTTPПОЛУЧИТЬ', detail: 'HTTP GET', documentation: 'Выполняет HTTP GET запрос', signature: 'HTTPGET(Соединение, Ресурс[, Заголовки[, ТолькоЗаголовки[, ТипРезультата]]])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Ресурс', documentation: 'URL ресурса' }, { label: 'Заголовки', documentation: 'Дополнительные заголовки (необязательный)' }] },
    { label: 'HTTPPOST', labelAlt: 'HTTPПОСЛАТЬ', detail: 'HTTP POST', documentation: 'Выполняет HTTP POST запрос', signature: 'HTTPPOST(Соединение, Ресурс, Данные[, Заголовки[, ТипРезультата]])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Ресурс', documentation: 'URL ресурса' }, { label: 'Данные', documentation: 'Текст или двоичные данные' }] },
    { label: 'HTTPPUT', labelAlt: 'HTTPРАЗМЕСТИТЬ', detail: 'HTTP PUT', documentation: 'Выполняет HTTP PUT запрос', signature: 'HTTPPUT(Соединение, Ресурс, Данные[, Заголовки])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Ресурс', documentation: 'URL ресурса' }, { label: 'Данные', documentation: 'Текст или двоичные данные' }] },
    { label: 'HTTPDELETE', labelAlt: 'HTTPУДАЛИТЬ', detail: 'HTTP DELETE', documentation: 'Выполняет HTTP DELETE запрос', signature: 'HTTPDELETE(Соединение, Ресурс[, Заголовки[, ТипРезультата]])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Ресурс', documentation: 'URL ресурса' }] },
    { label: 'HTTPOTHER', labelAlt: 'HTTPПРОЧЕЕ', detail: 'HTTP произвольный', documentation: 'Выполняет произвольный HTTP запрос (PATCH и др.)', signature: 'HTTPOTHER(Соединение, Команда, Ресурс, Данные[, Заголовки[, ТипРезультата]])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'Команда', documentation: 'HTTP метод (PATCH и т.д.)' }, { label: 'Ресурс', documentation: 'URL ресурса' }, { label: 'Данные', documentation: 'Текст или двоичные данные' }] },
    { label: 'HTTPTIMEOUT', labelAlt: 'HTTPВРЕМЯОЖИДАНИЯ', detail: 'HTTP таймаут', documentation: 'Устанавливает время ожидания для HTTP соединения', signature: 'HTTPTIMEOUT(Соединение, ВремяОжидания[, ТипИнтервала])', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ВремяОжидания', documentation: 'Время ожидания в миллисекундах' }] },
    { label: 'HTTPHEADERS', labelAlt: 'HTTPЗАГОЛОВКИ', detail: 'HTTP заголовки', documentation: 'Управляет возвратом заголовков в ответе', signature: 'HTTPHEADERS(Соединение, ВозвращатьЗаголовки)', params: [{ label: 'Соединение', documentation: 'Идентификатор соединения' }, { label: 'ВозвращатьЗаголовки', documentation: 'Логическое' }] },

    // COM порт
    { label: 'COMOPEN', labelAlt: 'COMОТКРЫТЬ', detail: 'Открыть COM порт', documentation: 'Открывает COM порт для обмена данными', signature: 'COMOPEN(СтрокаСоединения[, ФайлЖурнала])', params: [{ label: 'СтрокаСоединения', documentation: 'Параметры порта' }, { label: 'ФайлЖурнала', documentation: 'Имя файла журнала (необязательный)' }] },
    { label: 'COMCLOSE', labelAlt: 'COMЗАКРЫТЬ', detail: 'Закрыть COM порт', documentation: 'Закрывает COM порт', signature: 'COMCLOSE(Порт)', params: [{ label: 'Порт', documentation: 'Дескриптор порта' }] },
    { label: 'COMREAD', labelAlt: 'COMПРОЧИТАТЬ', detail: 'Чтение из COM порта', documentation: 'Читает данные из COM порта', signature: 'COMREAD(Порт, ЧислоБайт[, Интервал])', params: [{ label: 'Порт', documentation: 'Дескриптор порта' }, { label: 'ЧислоБайт', documentation: 'Количество байт' }] },
    { label: 'COMWRITE', labelAlt: 'COMЗАПИСАТЬ', detail: 'Запись в COM порт', documentation: 'Записывает данные в COM порт', signature: 'COMWRITE(Порт, Значение[, Интервал])', params: [{ label: 'Порт', documentation: 'Дескриптор порта' }, { label: 'Значение', documentation: 'Данные для записи' }] },

    // Файловые операции
    { label: 'FILECREATE', labelAlt: 'ФАЙЛСОЗДАТЬ', detail: 'Создать файл', documentation: 'Создает новый файл', signature: 'FILECREATE(ИмяФайла[, Флаги])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла' }, { label: 'Флаги', documentation: 'Флаги создания (необязательный)' }] },
    { label: 'FILEOPEN', labelAlt: 'ФАЙЛОТКРЫТЬ', detail: 'Открыть файл', documentation: 'Открывает существующий файл', signature: 'FILEOPEN(ИмяФайла[, Флаги[, Доступ]])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла' }, { label: 'Флаги', documentation: 'Флаги открытия (необязательный)' }] },
    { label: 'FILECLOSE', labelAlt: 'ФАЙЛЗАКРЫТЬ', detail: 'Закрыть файл', documentation: 'Закрывает файл', signature: 'FILECLOSE(ДескрипторФайла)', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }] },
    { label: 'FILEDELETE', labelAlt: 'ФАЙЛУДАЛИТЬ', detail: 'Удалить файл', documentation: 'Удаляет файл', signature: 'FILEDELETE(ИмяФайла)', params: [{ label: 'ИмяФайла', documentation: 'Имя файла' }] },
    { label: 'FILERENAME', labelAlt: 'ФАЙЛПЕРЕИМЕНОВАТЬ', detail: 'Переименовать файл', documentation: 'Переименовывает или перемещает файл', signature: 'FILERENAME(ИмяИсходного, ИмяРезультирующего)', params: [{ label: 'ИмяИсходного', documentation: 'Исходное имя' }, { label: 'ИмяРезультирующего', documentation: 'Новое имя' }] },
    { label: 'FILEREAD', labelAlt: 'ФАЙЛПРОЧИТАТЬ', detail: 'Чтение из файла', documentation: 'Читает данные из файла', signature: 'FILEREAD(ДескрипторФайла[, ТипЗначения[, КоличествоБайт[, ОграничительСтрок]]])', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }, { label: 'ТипЗначения', documentation: 'Тип данных (необязательный)' }] },
    { label: 'FILEWRITE', labelAlt: 'ФАЙЛЗАПИСАТЬ', detail: 'Запись в файл', documentation: 'Записывает данные в файл', signature: 'FILEWRITE(ДескрипторФайла|ИмяФайла, Значение[, КоличествоБайт])', params: [{ label: 'ДескрипторФайла|ИмяФайла', documentation: 'Дескриптор или имя файла' }, { label: 'Значение', documentation: 'Данные для записи' }] },
    { label: 'FILEWRITESTRING', labelAlt: 'ФАЙЛЗАПИСАТЬСТРОКУ', detail: 'Запись строки в файл', documentation: 'Записывает строку в файл', signature: 'FILEWRITESTRING(ДескрипторФайла|ИмяФайла, Строка)', params: [{ label: 'ДескрипторФайла|ИмяФайла', documentation: 'Дескриптор или имя файла' }, { label: 'Строка', documentation: 'Строка для записи' }] },
    { label: 'FILEFINDFIRST', labelAlt: 'ФАЙЛНАЙТИ', detail: 'Поиск файла', documentation: 'Ищет первый файл по шаблону', signature: 'FILEFINDFIRST(ШаблонИмени[, ИскатьПодкаталоги])', params: [{ label: 'ШаблонИмени', documentation: 'Шаблон имени файла' }] },
    { label: 'FILEFINDNEXT', labelAlt: 'ФАЙЛНАЙТИСЛЕДУЮЩИЙ', detail: 'Следующий файл', documentation: 'Ищет следующий файл по шаблону', signature: 'FILEFINDNEXT([ИскатьПодкаталоги])', params: [] },
    { label: 'FILEFINDCLOSE', labelAlt: 'ФАЙЛЗАКОНЧИТЬПОИСК', detail: 'Завершить поиск файлов', documentation: 'Завершает поиск файлов', signature: 'FILEFINDCLOSE()', params: [] },
    { label: 'FILESETPOINTER', labelAlt: 'ФАЙЛУСТАНОВИТЬУКАЗАТЕЛЬ', detail: 'Установить указатель файла', documentation: 'Устанавливает позицию указателя в файле', signature: 'FILESETPOINTER(ДескрипторФайла, МладшиеРазряды[, СтаршиеРазряды[, МетодПеремещения]])', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }, { label: 'МладшиеРазряды', documentation: 'Позиция (младшие разряды)' }] },
    { label: 'FILEGETPOINTER', labelAlt: 'ФАЙЛУКАЗАТЕЛЬ', detail: 'Позиция указателя файла', documentation: 'Возвращает текущую позицию указателя в файле', signature: 'FILEGETPOINTER(ДескрипторФайла[, СтаршиеРазряды])', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }] },
    { label: 'FILEGETSIZE', labelAlt: 'ФАЙЛРАЗМЕР', detail: 'Размер файла', documentation: 'Возвращает размер файла', signature: 'FILEGETSIZE(ДескрипторФайла[, СтаршиеРазряды])', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }] },
    { label: 'FILEEOF', labelAlt: 'ФАЙЛКОНЕЦФАЙЛА', detail: 'Конец файла?', documentation: 'Проверяет достижение конца файла', signature: 'FILEEOF(ДескрипторФайла)', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }] },
    { label: 'FILELINESCOUNT', labelAlt: 'ФАЙЛКОЛИЧЕСТВОСТРОК', detail: 'Кол-во строк в файле', documentation: 'Возвращает количество строк в файле', signature: 'FILELINESCOUNT(ДескрипторФайла[, ОграничительСтрок])', params: [{ label: 'ДескрипторФайла', documentation: 'Дескриптор файла' }] },
    { label: 'FILESLIST', labelAlt: 'ФАЙЛСПИСОК', detail: 'Список файлов', documentation: 'Возвращает список файлов по шаблону', signature: 'FILESLIST(ШаблонИмён[, ИмяМассива[, Флаги]])', params: [{ label: 'ШаблонИмён', documentation: 'Шаблон имён файлов' }] },
    { label: 'FILEEXISTS', labelAlt: 'ФАЙЛ', detail: 'Существует ли файл', documentation: 'Проверяет существование файла по шаблону', signature: 'FILEEXISTS(ШаблонИмени[, Флаги])', params: [{ label: 'ШаблонИмени', documentation: 'Шаблон имени файла' }] },
    { label: 'FILEPACK', labelAlt: 'ФАЙЛУПАКОВАТЬ', detail: 'Упаковать файл', documentation: 'Упаковывает (сжимает) файл', signature: 'FILEPACK(ИмяФайла[, ИмяУпакованного])', params: [{ label: 'ИмяФайла', documentation: 'Имя исходного файла' }, { label: 'ИмяУпакованного', documentation: 'Имя результата (необязательный)' }] },
    { label: 'FILEUNPACK', labelAlt: 'ФАЙЛРАСПАКОВАТЬ', detail: 'Распаковать файл', documentation: 'Распаковывает файл', signature: 'FILEUNPACK(ИмяУпакованного, ИмяФайла)', params: [{ label: 'ИмяУпакованного', documentation: 'Имя упакованного файла' }, { label: 'ИмяФайла', documentation: 'Имя файла результата' }] },
    { label: 'FILESELECT', labelAlt: 'ФАЙЛВЫБРАТЬ', detail: 'Диалог выбора файла', documentation: 'Отображает диалог выбора файла', signature: 'FILESELECT(ЧтениеЗапись, Фильтр[, Флаги[, РасширениеПоУмолчанию[, ИмяФайла]]])', params: [{ label: 'ЧтениеЗапись', documentation: '0-открыть, 1-сохранить' }, { label: 'Фильтр', documentation: 'Фильтр файлов' }] },
    { label: 'FILEWRITELOG', labelAlt: 'ФАЙЛЗАПИСАТЬВЖУРНАЛ', detail: 'Запись в журнал', documentation: 'Записывает сообщение в файл журнала', signature: 'FILEWRITELOG(ИмяФайла, Сообщение[, ЗаписыватьВремя])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла журнала' }, { label: 'Сообщение', documentation: 'Текст сообщения' }] },
    { label: 'DIRECTORYCREATE', labelAlt: 'КАТАЛОГСОЗДАТЬ', detail: 'Создать каталог', documentation: 'Создает каталог', signature: 'DIRECTORYCREATE(ИмяКаталога)', params: [{ label: 'ИмяКаталога', documentation: 'Имя каталога' }] },

    // XML
    { label: 'XMLSTARTDOCUMENT', labelAlt: 'XMLНАЧАТЬ', detail: 'Начать XML документ', documentation: 'Инициализирует создание XML документа', signature: 'XMLSTARTDOCUMENT([ИмяФайла[, Кодировка]])', params: [{ label: 'ИмяФайла', documentation: 'Имя файла (необязательный)' }, { label: 'Кодировка', documentation: 'Кодировка (необязательный)' }] },
    { label: 'XMLWRITEELEMENT', labelAlt: 'XMLЗАПИСАТЬТЕГ', detail: 'Записать XML тег', documentation: 'Записывает XML элемент (тег с текстом)', signature: 'XMLWRITEELEMENT(ДескрипторXML, ИмяТега[, Атрибуты[, Текст[, ФорматТекста[, ПространстваИмен]]]])', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }, { label: 'ИмяТега', documentation: 'Имя тега' }] },
    { label: 'XMLWRITEELEMENTSTART', labelAlt: 'XMLНАЧАЛОТЕГА', detail: 'Начало XML тега', documentation: 'Записывает открывающий XML тег', signature: 'XMLWRITEELEMENTSTART(ДескрипторXML, ИмяТега[, Атрибуты[, ПространстваИмен]])', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }, { label: 'ИмяТега', documentation: 'Имя тега' }] },
    { label: 'XMLWRITEELEMENTTEXT', labelAlt: 'XMLТЕКСТТЕГА', detail: 'Текст XML тега', documentation: 'Записывает текст внутри XML тега', signature: 'XMLWRITEELEMENTTEXT(ДескрипторXML, Текст[, ФорматТекста])', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }, { label: 'Текст', documentation: 'Текст' }] },
    { label: 'XMLWRITECOMMENT', labelAlt: 'XMLКОММЕНТАРИЙ', detail: 'XML комментарий', documentation: 'Записывает XML комментарий', signature: 'XMLWRITECOMMENT(ДескрипторXML, Комментарий)', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }, { label: 'Комментарий', documentation: 'Текст комментария' }] },
    { label: 'XMLWRITEELEMENTEND', labelAlt: 'XMLЗАВЕРШИТЬТЕГ', detail: 'Конец XML тега', documentation: 'Записывает закрывающий XML тег', signature: 'XMLWRITEELEMENTEND(ДескрипторXML)', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }] },
    { label: 'XMLERRORCODE', labelAlt: 'XMLКОДОШИБКИ', detail: 'Код ошибки XML', documentation: 'Возвращает код последней ошибки XML', signature: 'XMLERRORCODE(ДескрипторXML)', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }] },
    { label: 'XMLCLEARERROR', labelAlt: 'XMLОЧИСТИТЬОШИБКИ', detail: 'Очистить ошибки XML', documentation: 'Очищает ошибки XML', signature: 'XMLCLEARERROR(ДескрипторXML)', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }] },
    { label: 'XMLENDDOCUMENT', labelAlt: 'XMLЗАКОНЧИТЬ', detail: 'Завершить XML документ', documentation: 'Завершает создание XML документа', signature: 'XMLENDDOCUMENT(ДескрипторXML)', params: [{ label: 'ДескрипторXML', documentation: 'Дескриптор XML' }] },

    // Архивы
    { label: 'ZIPOPEN', labelAlt: 'АРХИВОТКРЫТЬ', detail: 'Открыть ZIP архив', documentation: 'Открывает ZIP архив', signature: 'ZIPOPEN(ИмяФайла|ДвоичныеДанные)', params: [{ label: 'ИмяФайла|ДвоичныеДанные', documentation: 'Файл или данные архива' }] },
    { label: 'ZIPCLOSE', labelAlt: 'АРХИВЗАКРЫТЬ', detail: 'Закрыть ZIP архив', documentation: 'Закрывает ZIP архив', signature: 'ZIPCLOSE(НомерАрхива[, ОтменитьИзменения])', params: [{ label: 'НомерАрхива', documentation: 'Номер архива' }] },
    { label: 'ZIP', labelAlt: 'АРХИВ', detail: 'Операция с ZIP', documentation: 'Выполняет операцию с ZIP архивом (добавить, извлечь, удалить и др.)', signature: 'ZIP(Номер|ИмяАрхива|Данные, Операция[, ИмяФайла|НомерФайла[, ИмяФайлаВОС|Данные[, Комментарий[, Флаги]]]])', params: [{ label: 'Номер|ИмяАрхива', documentation: 'Номер, имя или данные архива' }, { label: 'Операция', documentation: 'Код операции' }] },
    { label: 'RAROPEN', labelAlt: 'РАРОТКРЫТЬ', detail: 'Открыть RAR архив', documentation: 'Открывает RAR архив', signature: 'RAROPEN(ИмяФайла|ДвоичныеДанные)', params: [{ label: 'ИмяФайла|ДвоичныеДанные', documentation: 'Файл или данные архива' }] },
    { label: 'RARCLOSE', labelAlt: 'РАРЗАКРЫТЬ', detail: 'Закрыть RAR архив', documentation: 'Закрывает RAR архив', signature: 'RARCLOSE(НомерАрхива)', params: [{ label: 'НомерАрхива', documentation: 'Номер архива' }] },
    { label: 'RAR', labelAlt: 'РАРАРХИВ', detail: 'Операция с RAR', documentation: 'Выполняет операцию с RAR архивом', signature: 'RAR(Номер|ИмяАрхива|Данные, Операция[, ИмяФайла|НомерФайла[, ПутьРаспаковки|ИмяМассив[, СоздаватьКаталоги]]])', params: [{ label: 'Номер|ИмяАрхива', documentation: 'Номер, имя или данные архива' }, { label: 'Операция', documentation: 'Код операции' }] },
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

class ItidaDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition | undefined {
        // 1. Library function: Alias.FuncName → .txt source file
        const libRange = document.getWordRangeAtPosition(position, /[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*\.[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*/);
        if (libRange) {
            const fullText = document.getText(libRange);
            const dotIdx = fullText.indexOf('.');
            const alias = fullText.substring(0, dotIdx);
            const funcName = fullText.substring(dotIdx + 1);
            const libFunc = libraryStore.getFunctionByFullName(alias, funcName);
            if (libFunc?.sourceFile) {
                return new vscode.Location(vscode.Uri.file(libFunc.sourceFile), new vscode.Position(0, 0));
            }
        }

        // 2. Document-defined function: jump to FUNCTION/ФУНКЦИЯ declaration
        const wordRange = document.getWordRangeAtPosition(position, /[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*/);
        if (!wordRange) { return undefined; }
        const word = document.getText(wordRange);

        const text = document.getText();
        const funcPattern = new RegExp(
            `(?:FUNCTION|ФУНКЦИЯ)\\s+(?:LOCAL\\s+|ЛОКАЛЬНАЯ\\s+)?${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`,
            'i'
        );
        const match = funcPattern.exec(text);
        if (match) {
            const pos = document.positionAt(match.index);
            return new vscode.Location(document.uri, pos);
        }

        return undefined;
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

    // Create library function command
    context.subscriptions.push(
        vscode.commands.registerCommand('itida.createLibraryFunction', async () => {
            const libPath = vscode.workspace.getConfiguration('itida').get<string>('functionLibraryPath', '');
            if (!libPath) {
                vscode.window.showWarningMessage('Айтида: путь к библиотекам не задан (itida.functionLibraryPath)');
                return;
            }

            const libs = libraryStore.libraries;
            if (libs.length === 0) {
                vscode.window.showWarningMessage('Айтида: библиотеки не найдены в указанном каталоге');
                return;
            }

            // Pick library
            const libItems = libs.map(lib => ({
                label: lib.libalias,
                description: lib.libname,
                lib
            }));
            const picked = await vscode.window.showQuickPick(libItems, {
                placeHolder: 'Выберите библиотеку'
            });
            if (!picked) { return; }

            // Scan subdirectories for folder picker
            const selectedLib = picked.lib;
            const libDir = selectedLib.dirPath;
            const subfolders: { label: string; description: string; dirPath: string; groupname: string }[] = [];

            // Root of library (no subfolder)
            subfolders.push({
                label: '(корень библиотеки)',
                description: libDir,
                dirPath: libDir,
                groupname: ''
            });

            function scanSubfolders(dir: string, relativeParts: string[]): void {
                let entries: fs.Dirent[];
                try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        const parts = [...relativeParts, entry.name];
                        const fullPath = path.join(dir, entry.name);
                        subfolders.push({
                            label: parts.join('.'),
                            description: fullPath,
                            dirPath: fullPath,
                            groupname: parts.join('.')
                        });
                        scanSubfolders(fullPath, parts);
                    }
                }
            }
            scanSubfolders(libDir, []);

            // Pick folder (skip if no subfolders)
            let targetDir = libDir;
            let groupname = picked.lib.libname;

            if (subfolders.length > 1) {
                const folderPicked = await vscode.window.showQuickPick(subfolders, {
                    placeHolder: 'Выберите папку (группу) для функции'
                });
                if (!folderPicked) { return; }
                targetDir = folderPicked.dirPath;
                groupname = folderPicked.groupname;
            }

            // Enter function name
            const funcName = await vscode.window.showInputBox({
                prompt: 'Имя новой функции',
                placeHolder: 'МояФункция',
                validateInput: (v) => {
                    if (!v.trim()) { return 'Введите имя функции'; }
                    if (!/^[а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*$/.test(v)) {
                        return 'Недопустимые символы в имени функции';
                    }
                    return undefined;
                }
            });
            if (!funcName) { return; }

            // Enter params (optional)
            const paramsInput = await vscode.window.showInputBox({
                prompt: 'Параметры через запятую (можно оставить пустым)',
                placeHolder: 'Парам1, Парам2, Парам3'
            });
            if (paramsInput === undefined) { return; }

            const params = paramsInput.trim()
                ? paramsInput.split(',').map(p => p.trim()).filter(p => p.length > 0)
                : [];

            // Ask isLocal
            const localPick = await vscode.window.showQuickPick(
                [
                    { label: 'Нет', description: 'Публичная функция', isLocal: false },
                    { label: 'Да', description: 'Локальная функция', isLocal: true }
                ],
                { placeHolder: 'Локальная функция?' }
            );
            if (!localPick) { return; }

            const txtPath = path.join(targetDir, `${funcName}.txt`);
            const jsonPath = path.join(targetDir, `${funcName}.json`);

            if (fs.existsSync(txtPath) || fs.existsSync(jsonPath)) {
                vscode.window.showWarningMessage(`Функция ${funcName} уже существует в этой папке`);
                return;
            }

            // Create empty .txt
            // Create .json with metadata
            const jsonData = generateFunctionJson(funcName, params, groupname, localPick.isLocal);

            try {
                fs.writeFileSync(txtPath, '', 'utf-8');
                fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4), 'utf-8');
            } catch (err: any) {
                vscode.window.showErrorMessage(`Ошибка создания файлов: ${err.message}`);
                return;
            }

            loadLibraries();

            // Open .txt file in editor
            const doc = await vscode.workspace.openTextDocument(txtPath);
            await vscode.window.showTextDocument(doc);

            vscode.window.setStatusBarMessage(`Айтида: функция ${selectedLib.libalias}.${funcName} создана`, 5000);
        })
    );

    // Register providers
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, new ItidaCompletionProvider(), '.', '('),
        vscode.languages.registerHoverProvider(selector, new ItidaHoverProvider()),
        vscode.languages.registerSignatureHelpProvider(selector, new ItidaSignatureHelpProvider(), '(', ','),
        vscode.languages.registerDocumentSymbolProvider(selector, new ItidaDocumentSymbolProvider()),
        vscode.languages.registerDefinitionProvider(selector, new ItidaDefinitionProvider()),
    );
}

export function deactivate() {}
