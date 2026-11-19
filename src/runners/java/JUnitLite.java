// ===================== JUnit-lite (platforma rekrutacyjna) =====================
// Minimalna, zgodna składniowo podmiana JUnit 5 + AssertJ, kompilowana razem z kodem
// kandydata do jednego pliku Main.java (Java 17). Nie edytuj – generowane automatycznie.

@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface Test {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface BeforeEach {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface AfterEach {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface BeforeAll {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface AfterAll {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @interface Disabled { String value() default ""; }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @interface DisplayName { String value(); }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @interface Tag { String value(); }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @interface Tags { Tag[] value(); }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface ParameterizedTest { String name() default ""; }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface RepeatedTest { int value(); }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface ValueSource {
  int[] ints() default {}; long[] longs() default {}; double[] doubles() default {};
  String[] strings() default {}; boolean[] booleans() default {}; char[] chars() default {};
}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface CsvSource { String[] value(); char delimiter() default ','; }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface MethodSource { String[] value() default {}; }
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface NullSource {}
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) @interface EmptySource {}

interface Executable { void execute() throws Throwable; }
interface ThrowingCallable { void call() throws Throwable; }

interface Arguments {
  Object[] get();
  static Arguments of(Object... args) { final Object[] a = args; return new Arguments() { public Object[] get() { return a; } }; }
  static Arguments arguments(Object... args) { return of(args); }
}

class AssertionFailedError extends AssertionError {
  AssertionFailedError(String message) { super(message); }
}

class Assertions {
  static String __fmt(Object o) {
    if (o == null) return "null";
    if (o instanceof String) return "\"" + o + "\"";
    if (o instanceof Character) return "'" + o + "'";
    if (o instanceof Object[]) return java.util.Arrays.deepToString((Object[]) o);
    if (o instanceof int[]) return java.util.Arrays.toString((int[]) o);
    if (o instanceof long[]) return java.util.Arrays.toString((long[]) o);
    if (o instanceof double[]) return java.util.Arrays.toString((double[]) o);
    if (o instanceof char[]) return java.util.Arrays.toString((char[]) o);
    if (o instanceof byte[]) return java.util.Arrays.toString((byte[]) o);
    if (o instanceof boolean[]) return java.util.Arrays.toString((boolean[]) o);
    return String.valueOf(o);
  }
  static String __prefix(String msg) { return (msg == null || msg.isEmpty()) ? "" : msg + " ==> "; }
  static AssertionFailedError __fail(String msg, String detail) { return new AssertionFailedError(__prefix(msg) + detail); }
  static void __eq(Object e, Object a, String msg) {
    if (!java.util.Objects.equals(e, a)) throw __fail(msg, "expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">");
  }

  // ---------- JUnit 5: assertEquals (przeciążenia jak w JUnit, bez niejednoznaczności) ----------
  static void assertEquals(Object e, Object a) { __eq(e, a, null); }
  static void assertEquals(Object e, Object a, String m) { __eq(e, a, m); }
  static void assertEquals(int e, int a) { __eq(e, a, null); }
  static void assertEquals(int e, int a, String m) { __eq(e, a, m); }
  static void assertEquals(int e, Integer a) { __eq(e, a, null); }
  static void assertEquals(int e, Integer a, String m) { __eq(e, a, m); }
  static void assertEquals(Integer e, int a) { __eq(e, a, null); }
  static void assertEquals(Integer e, int a, String m) { __eq(e, a, m); }
  static void assertEquals(Integer e, Integer a) { __eq(e, a, null); }
  static void assertEquals(Integer e, Integer a, String m) { __eq(e, a, m); }
  static void assertEquals(long e, long a) { __eq(e, a, null); }
  static void assertEquals(long e, long a, String m) { __eq(e, a, m); }
  static void assertEquals(long e, Long a) { __eq(e, a, null); }
  static void assertEquals(long e, Long a, String m) { __eq(e, a, m); }
  static void assertEquals(Long e, long a) { __eq(e, a, null); }
  static void assertEquals(Long e, long a, String m) { __eq(e, a, m); }
  static void assertEquals(Long e, Long a) { __eq(e, a, null); }
  static void assertEquals(Long e, Long a, String m) { __eq(e, a, m); }
  static void assertEquals(char e, char a) { __eq(e, a, null); }
  static void assertEquals(char e, char a, String m) { __eq(e, a, m); }
  static void assertEquals(char e, Character a) { __eq(e, a, null); }
  static void assertEquals(char e, Character a, String m) { __eq(e, a, m); }
  static void assertEquals(Character e, char a) { __eq(e, a, null); }
  static void assertEquals(Character e, char a, String m) { __eq(e, a, m); }
  static void assertEquals(Character e, Character a) { __eq(e, a, null); }
  static void assertEquals(Character e, Character a, String m) { __eq(e, a, m); }
  static void assertEquals(double e, double a) { if (Double.doubleToLongBits(e) != Double.doubleToLongBits(a)) __eq(e, a, null); }
  static void assertEquals(double e, double a, String m) { if (Double.doubleToLongBits(e) != Double.doubleToLongBits(a)) __eq(e, a, m); }
  static void assertEquals(double e, Double a) { __eq(e, a, null); }
  static void assertEquals(double e, Double a, String m) { __eq(e, a, m); }
  static void assertEquals(Double e, double a) { __eq(e, a, null); }
  static void assertEquals(Double e, double a, String m) { __eq(e, a, m); }
  static void assertEquals(Double e, Double a) { __eq(e, a, null); }
  static void assertEquals(Double e, Double a, String m) { __eq(e, a, m); }
  static void assertEquals(double e, double a, double delta) { assertEquals(e, a, delta, null); }
  static void assertEquals(double e, double a, double delta, String m) {
    if (Math.abs(e - a) > delta) throw __fail(m, "expected: <" + e + "> but was: <" + a + "> (delta " + delta + ")");
  }

  static void assertNotEquals(Object u, Object a) { assertNotEquals(u, a, null); }
  static void assertNotEquals(Object u, Object a, String m) {
    if (java.util.Objects.equals(u, a)) throw __fail(m, "expected: not equal but was: <" + __fmt(a) + ">");
  }
  static void assertTrue(boolean c) { assertTrue(c, null); }
  static void assertTrue(boolean c, String m) { if (!c) throw __fail(m, "expected: <true> but was: <false>"); }
  static void assertFalse(boolean c) { assertFalse(c, null); }
  static void assertFalse(boolean c, String m) { if (c) throw __fail(m, "expected: <false> but was: <true>"); }
  static void assertNull(Object a) { assertNull(a, null); }
  static void assertNull(Object a, String m) { if (a != null) throw __fail(m, "expected: <null> but was: <" + __fmt(a) + ">"); }
  static void assertNotNull(Object a) { assertNotNull(a, null); }
  static void assertNotNull(Object a, String m) { if (a == null) throw __fail(m, "expected: not <null>"); }
  static void assertSame(Object e, Object a) { assertSame(e, a, null); }
  static void assertSame(Object e, Object a, String m) { if (e != a) throw __fail(m, "expected same: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertNotSame(Object u, Object a) { assertNotSame(u, a, null); }
  static void assertNotSame(Object u, Object a, String m) { if (u == a) throw __fail(m, "expected: not same but was: <" + __fmt(a) + ">"); }

  static void assertArrayEquals(Object[] e, Object[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(Object[] e, Object[] a, String m) { if (!java.util.Arrays.deepEquals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertArrayEquals(int[] e, int[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(int[] e, int[] a, String m) { if (!java.util.Arrays.equals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertArrayEquals(long[] e, long[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(long[] e, long[] a, String m) { if (!java.util.Arrays.equals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertArrayEquals(double[] e, double[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(double[] e, double[] a, String m) { if (!java.util.Arrays.equals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertArrayEquals(char[] e, char[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(char[] e, char[] a, String m) { if (!java.util.Arrays.equals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertArrayEquals(byte[] e, byte[] a) { assertArrayEquals(e, a, null); }
  static void assertArrayEquals(byte[] e, byte[] a, String m) { if (!java.util.Arrays.equals(e, a)) throw __fail(m, "arrays differ, expected: <" + __fmt(e) + "> but was: <" + __fmt(a) + ">"); }
  static void assertIterableEquals(Iterable<?> e, Iterable<?> a) { assertIterableEquals(e, a, null); }
  static void assertIterableEquals(Iterable<?> e, Iterable<?> a, String m) {
    java.util.List<Object> le = new java.util.ArrayList<>(); if (e != null) for (Object o : e) le.add(o);
    java.util.List<Object> la = new java.util.ArrayList<>(); if (a != null) for (Object o : a) la.add(o);
    if (!le.equals(la)) throw __fail(m, "iterables differ, expected: <" + le + "> but was: <" + la + ">");
  }

  static <T extends Throwable> T assertThrows(Class<T> type, Executable ex) { return assertThrows(type, ex, null); }
  static <T extends Throwable> T assertThrows(Class<T> type, Executable ex, String m) {
    try { ex.execute(); }
    catch (Throwable t) {
      if (type.isInstance(t)) return type.cast(t);
      AssertionFailedError err = __fail(m, "Unexpected exception type thrown, expected: <" + type.getName() + "> but was: <" + t.getClass().getName() + ">");
      err.initCause(t); throw err;
    }
    throw __fail(m, "Expected " + type.getName() + " to be thrown, but nothing was thrown.");
  }
  static void assertDoesNotThrow(Executable ex) { assertDoesNotThrow(ex, null); }
  static void assertDoesNotThrow(Executable ex, String m) {
    try { ex.execute(); }
    catch (Throwable t) { AssertionFailedError err = __fail(m, "Unexpected exception thrown: " + t); err.initCause(t); throw err; }
  }
  static void assertAll(Executable... exs) { assertAll(null, exs); }
  static void assertAll(String heading, Executable... exs) {
    java.util.List<Throwable> errs = new java.util.ArrayList<>();
    for (Executable e : exs) { try { e.execute(); } catch (Throwable t) { errs.add(t); } }
    if (!errs.isEmpty()) {
      StringBuilder sb = new StringBuilder((heading == null ? "Multiple failures" : heading) + " (" + errs.size() + " failure" + (errs.size() > 1 ? "s" : "") + ")");
      for (Throwable t : errs) sb.append("\n\t").append(t instanceof AssertionError ? t.getMessage() : t.toString());
      throw new AssertionFailedError(sb.toString());
    }
  }
  static <T> T assertInstanceOf(Class<T> type, Object a) { return assertInstanceOf(type, a, null); }
  static <T> T assertInstanceOf(Class<T> type, Object a, String m) {
    if (!type.isInstance(a)) throw __fail(m, "Unexpected type, expected: <" + type.getName() + "> but was: <" + (a == null ? "null" : a.getClass().getName()) + ">");
    return type.cast(a);
  }
  static <V> V fail() { throw new AssertionFailedError("fail"); }
  static <V> V fail(String m) { throw new AssertionFailedError(m); }

  // ---------- AssertJ (podzbiór) ----------
  static StringAssert assertThat(String a) { return new StringAssert(a); }
  static BooleanAssert assertThat(Boolean a) { return new BooleanAssert(a); }
  static NumberAssert<Integer> assertThat(Integer a) { return new NumberAssert<>(a); }
  static NumberAssert<Long> assertThat(Long a) { return new NumberAssert<>(a); }
  static NumberAssert<Double> assertThat(Double a) { return new NumberAssert<>(a); }
  static NumberAssert<java.math.BigDecimal> assertThat(java.math.BigDecimal a) { return new NumberAssert<>(a); }
  static <E> IterableAssert<E> assertThat(Iterable<? extends E> a) { return new IterableAssert<E>(a); }
  static <E> IterableAssert<E> assertThat(E[] a) { return new IterableAssert<E>(a == null ? null : java.util.Arrays.asList(a)); }
  static <K, V> MapAssert<K, V> assertThat(java.util.Map<K, V> a) { return new MapAssert<>(a); }
  static <T> OptionalAssert<T> assertThat(java.util.Optional<T> a) { return new OptionalAssert<>(a); }
  static <T> ObjectAssert<T> assertThat(T a) { return new ObjectAssert<>(a); }
  static ThrowableAssert assertThatThrownBy(ThrowingCallable c) {
    try { c.call(); } catch (Throwable t) { return new ThrowableAssert(t); }
    throw new AssertionFailedError("Expecting code to raise a throwable.");
  }
  static ThrowableAssert assertThatThrownBy(ThrowingCallable c, String description) { return assertThatThrownBy(c); }
  static NotThrownAssert assertThatCode(ThrowingCallable c) {
    try { c.call(); return new NotThrownAssert(null); } catch (Throwable t) { return new NotThrownAssert(t); }
  }
  static <T extends Throwable> ExceptionTypeAssert<T> assertThatExceptionOfType(Class<T> type) { return new ExceptionTypeAssert<>(type); }
  static ExceptionTypeAssert<IllegalArgumentException> assertThatIllegalArgumentException() { return new ExceptionTypeAssert<>(IllegalArgumentException.class); }
  static ExceptionTypeAssert<IllegalStateException> assertThatIllegalStateException() { return new ExceptionTypeAssert<>(IllegalStateException.class); }
  static ExceptionTypeAssert<NullPointerException> assertThatNullPointerException() { return new ExceptionTypeAssert<>(NullPointerException.class); }
}

@SuppressWarnings("unchecked")
abstract class AbstractAssert<SELF extends AbstractAssert<SELF, A>, A> {
  protected final A actual;
  protected String description;
  AbstractAssert(A actual) { this.actual = actual; }
  protected SELF self() { return (SELF) this; }
  protected AssertionFailedError failure(String detail) {
    return new AssertionFailedError((description == null ? "" : "[" + description + "] ") + detail);
  }
  public SELF as(String d, Object... args) { this.description = args.length == 0 ? d : String.format(d, args); return self(); }
  public SELF describedAs(String d, Object... args) { return as(d, args); }
  public SELF isEqualTo(Object e) { if (!java.util.Objects.equals(actual, e)) throw failure("\nexpected: " + Assertions.__fmt(e) + "\n but was: " + Assertions.__fmt(actual)); return self(); }
  public SELF isNotEqualTo(Object e) { if (java.util.Objects.equals(actual, e)) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nnot to be equal to:\n  " + Assertions.__fmt(e)); return self(); }
  public void isNull() { if (actual != null) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nto be null"); }
  public SELF isNotNull() { if (actual == null) throw failure("\nExpecting actual not to be null"); return self(); }
  public SELF isSameAs(Object e) { if (actual != e) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nand:\n  " + Assertions.__fmt(e) + "\nto refer to the same object"); return self(); }
  public SELF isNotSameAs(Object e) { if (actual == e) throw failure("\nExpecting actual not to be the same as given object"); return self(); }
  public SELF isInstanceOf(Class<?> type) { if (!type.isInstance(actual)) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nto be an instance of:\n  " + type.getName()); return self(); }
  public SELF isIn(Object... values) { if (!java.util.Arrays.asList(values).contains(actual)) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nto be in:\n  " + java.util.Arrays.toString(values)); return self(); }
  public SELF matches(java.util.function.Predicate<? super A> p) { if (!p.test(actual)) throw failure("\nExpecting actual:\n  " + Assertions.__fmt(actual) + "\nto match given predicate"); return self(); }
  public SELF satisfies(java.util.function.Consumer<? super A> c) { c.accept(actual); return self(); }
  protected void notNull() { if (actual == null) throw failure("\nExpecting actual not to be null"); }
}

class ObjectAssert<T> extends AbstractAssert<ObjectAssert<T>, T> {
  ObjectAssert(T a) { super(a); }
  public ObjectAssert<T> hasToString(String s) { notNull(); if (!actual.toString().equals(s)) throw failure("\nExpecting toString():\n  " + actual + "\nto be:\n  " + s); return this; }
  public <R> ObjectAssert<R> extracting(java.util.function.Function<? super T, ? extends R> f) { notNull(); return new ObjectAssert<R>(f.apply(actual)); }
}

class BooleanAssert extends AbstractAssert<BooleanAssert, Boolean> {
  BooleanAssert(Boolean a) { super(a); }
  public BooleanAssert isTrue() { if (!Boolean.TRUE.equals(actual)) throw failure("\nExpecting value to be true but was false"); return this; }
  public BooleanAssert isFalse() { if (!Boolean.FALSE.equals(actual)) throw failure("\nExpecting value to be false but was true"); return this; }
}

class StringAssert extends AbstractAssert<StringAssert, String> {
  StringAssert(String a) { super(a); }
  public StringAssert isEmpty() { notNull(); if (!actual.isEmpty()) throw failure("\nExpecting empty but was: \"" + actual + "\""); return this; }
  public StringAssert isNotEmpty() { notNull(); if (actual.isEmpty()) throw failure("\nExpecting actual not to be empty"); return this; }
  public StringAssert isNullOrEmpty() { if (actual != null && !actual.isEmpty()) throw failure("\nExpecting null or empty but was: \"" + actual + "\""); return this; }
  public StringAssert isBlank() { if (actual != null && !actual.trim().isEmpty()) throw failure("\nExpecting blank but was: \"" + actual + "\""); return this; }
  public StringAssert isNotBlank() { if (actual == null || actual.trim().isEmpty()) throw failure("\nExpecting not blank but was: " + Assertions.__fmt(actual)); return this; }
  public StringAssert hasSize(int n) { notNull(); if (actual.length() != n) throw failure("\nExpected size: " + n + " but was: " + actual.length() + " in:\n\"" + actual + "\""); return this; }
  public StringAssert contains(CharSequence... parts) { notNull(); for (CharSequence p : parts) if (!actual.contains(p)) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nto contain:\n  \"" + p + "\""); return this; }
  public StringAssert doesNotContain(CharSequence... parts) { notNull(); for (CharSequence p : parts) if (actual.contains(p)) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nnot to contain:\n  \"" + p + "\""); return this; }
  public StringAssert containsIgnoringCase(CharSequence p) { notNull(); if (!actual.toLowerCase().contains(p.toString().toLowerCase())) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nto contain (ignoring case):\n  \"" + p + "\""); return this; }
  public StringAssert startsWith(String p) { notNull(); if (!actual.startsWith(p)) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nto start with:\n  \"" + p + "\""); return this; }
  public StringAssert endsWith(String p) { notNull(); if (!actual.endsWith(p)) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nto end with:\n  \"" + p + "\""); return this; }
  public StringAssert matches(String regex) { notNull(); if (!actual.matches(regex)) throw failure("\nExpecting actual:\n  \"" + actual + "\"\nto match pattern:\n  \"" + regex + "\""); return this; }
  public StringAssert isEqualToIgnoringCase(String e) { if (actual == null ? e != null : !actual.equalsIgnoreCase(e)) throw failure("\nexpected (ignoring case): \"" + e + "\"\n but was: \"" + actual + "\""); return this; }
  public StringAssert isEqualToIgnoringWhitespace(String e) { String a = actual == null ? null : actual.replaceAll("\\s+", ""); String b = e == null ? null : e.replaceAll("\\s+", ""); if (!java.util.Objects.equals(a, b)) throw failure("\nexpected (ignoring whitespace): \"" + e + "\"\n but was: \"" + actual + "\""); return this; }
}

@SuppressWarnings({"unchecked", "rawtypes"})
class NumberAssert<N extends Comparable> extends AbstractAssert<NumberAssert<N>, N> {
  NumberAssert(N a) { super(a); }
  private int cmp(Object o) { notNull(); return actual.compareTo(o); }
  public NumberAssert<N> isGreaterThan(N o) { if (cmp(o) <= 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be greater than:\n  " + o); return this; }
  public NumberAssert<N> isGreaterThanOrEqualTo(N o) { if (cmp(o) < 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be greater than or equal to:\n  " + o); return this; }
  public NumberAssert<N> isLessThan(N o) { if (cmp(o) >= 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be less than:\n  " + o); return this; }
  public NumberAssert<N> isLessThanOrEqualTo(N o) { if (cmp(o) > 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be less than or equal to:\n  " + o); return this; }
  public NumberAssert<N> isBetween(N lo, N hi) { if (cmp(lo) < 0 || cmp(hi) > 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be between:\n  [" + lo + ", " + hi + "]"); return this; }
  private double dv() { notNull(); return ((Number) actual).doubleValue(); }
  public NumberAssert<N> isZero() { if (dv() != 0) throw failure("\nexpected: 0\n but was: " + actual); return this; }
  public NumberAssert<N> isNotZero() { if (dv() == 0) throw failure("\nExpecting actual not to be 0"); return this; }
  public NumberAssert<N> isPositive() { if (dv() <= 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be positive"); return this; }
  public NumberAssert<N> isNegative() { if (dv() >= 0) throw failure("\nExpecting actual:\n  " + actual + "\nto be negative"); return this; }
  public NumberAssert<N> isCloseTo(double expected, double offset) { if (Math.abs(dv() - expected) > offset) throw failure("\nExpecting actual:\n  " + actual + "\nto be close to:\n  " + expected + " (offset " + offset + ")"); return this; }
  public NumberAssert<N> isEqualByComparingTo(N o) { if (cmp(o) != 0) throw failure("\nexpected: " + o + "\n but was: " + actual); return this; }
}

class IterableAssert<E> extends AbstractAssert<IterableAssert<E>, Iterable<? extends E>> {
  IterableAssert(Iterable<? extends E> a) { super(a); }
  private java.util.List<E> list() { notNull(); java.util.List<E> l = new java.util.ArrayList<>(); for (E e : actual) l.add(e); return l; }
  public IterableAssert<E> hasSize(int n) { int s = list().size(); if (s != n) throw failure("\nExpected size: " + n + " but was: " + s + " in:\n" + list()); return this; }
  public IterableAssert<E> isEmpty() { if (!list().isEmpty()) throw failure("\nExpecting empty but was: " + list()); return this; }
  public IterableAssert<E> isNotEmpty() { if (list().isEmpty()) throw failure("\nExpecting actual not to be empty"); return this; }
  @SafeVarargs public final IterableAssert<E> contains(E... v) { java.util.List<E> l = list(); for (E e : v) if (!l.contains(e)) throw failure("\nExpecting:\n  " + l + "\nto contain:\n  " + java.util.Arrays.toString(v) + "\nbut could not find:\n  " + Assertions.__fmt(e)); return this; }
  @SafeVarargs public final IterableAssert<E> doesNotContain(E... v) { java.util.List<E> l = list(); for (E e : v) if (l.contains(e)) throw failure("\nExpecting:\n  " + l + "\nnot to contain:\n  " + Assertions.__fmt(e)); return this; }
  @SafeVarargs public final IterableAssert<E> containsExactly(E... v) { java.util.List<E> l = list(); if (!l.equals(java.util.Arrays.asList(v))) throw failure("\nExpecting actual:\n  " + l + "\nto contain exactly (and in same order):\n  " + java.util.Arrays.toString(v)); return this; }
  @SafeVarargs public final IterableAssert<E> containsExactlyInAnyOrder(E... v) {
    java.util.List<E> l = list(); java.util.List<E> rest = new java.util.ArrayList<>(l);
    boolean ok = l.size() == v.length; if (ok) for (E e : v) if (!rest.remove(e)) { ok = false; break; }
    if (!ok) throw failure("\nExpecting actual:\n  " + l + "\nto contain exactly in any order:\n  " + java.util.Arrays.toString(v)); return this;
  }
  @SafeVarargs public final IterableAssert<E> containsOnly(E... v) { java.util.List<E> want = java.util.Arrays.asList(v); java.util.List<E> l = list(); if (!new java.util.HashSet<>(l).equals(new java.util.HashSet<>(want))) throw failure("\nExpecting actual:\n  " + l + "\nto contain only:\n  " + want); return this; }
  public IterableAssert<E> doesNotHaveDuplicates() { java.util.List<E> l = list(); if (new java.util.HashSet<>(l).size() != l.size()) throw failure("\nFound duplicate(s) in:\n  " + l); return this; }
  public IterableAssert<E> allMatch(java.util.function.Predicate<? super E> p) { for (E e : list()) if (!p.test(e)) throw failure("\nExpecting all elements to match predicate but this element did not:\n  " + Assertions.__fmt(e)); return this; }
  public IterableAssert<E> anyMatch(java.util.function.Predicate<? super E> p) { for (E e : list()) if (p.test(e)) return this; throw failure("\nExpecting any element of:\n  " + list() + "\nto match predicate"); }
  public IterableAssert<E> noneMatch(java.util.function.Predicate<? super E> p) { for (E e : list()) if (p.test(e)) throw failure("\nExpecting no element to match predicate but this one did:\n  " + Assertions.__fmt(e)); return this; }
  public <R> IterableAssert<R> extracting(java.util.function.Function<? super E, ? extends R> f) { java.util.List<R> out = new java.util.ArrayList<>(); for (E e : list()) out.add(f.apply(e)); return new IterableAssert<R>(out); }
  public IterableAssert<E> filteredOn(java.util.function.Predicate<? super E> p) { java.util.List<E> out = new java.util.ArrayList<>(); for (E e : list()) if (p.test(e)) out.add(e); return new IterableAssert<E>(out); }
  public ObjectAssert<E> first() { java.util.List<E> l = list(); if (l.isEmpty()) throw failure("\nExpecting actual not to be empty"); return new ObjectAssert<E>(l.get(0)); }
  public ObjectAssert<E> element(int i) { java.util.List<E> l = list(); if (i >= l.size()) throw failure("\nIndex " + i + " out of bounds for size " + l.size()); return new ObjectAssert<E>(l.get(i)); }
}

class MapAssert<K, V> extends AbstractAssert<MapAssert<K, V>, java.util.Map<K, V>> {
  MapAssert(java.util.Map<K, V> a) { super(a); }
  public MapAssert<K, V> hasSize(int n) { notNull(); if (actual.size() != n) throw failure("\nExpected size: " + n + " but was: " + actual.size() + " in:\n" + actual); return this; }
  public MapAssert<K, V> isEmpty() { notNull(); if (!actual.isEmpty()) throw failure("\nExpecting empty but was: " + actual); return this; }
  public MapAssert<K, V> isNotEmpty() { notNull(); if (actual.isEmpty()) throw failure("\nExpecting actual not to be empty"); return this; }
  @SafeVarargs public final MapAssert<K, V> containsKeys(K... keys) { notNull(); for (K k : keys) if (!actual.containsKey(k)) throw failure("\nExpecting actual:\n  " + actual + "\nto contain key:\n  " + Assertions.__fmt(k)); return this; }
  public MapAssert<K, V> containsKey(K k) { notNull(); if (!actual.containsKey(k)) throw failure("\nExpecting actual:\n  " + actual + "\nto contain key:\n  " + Assertions.__fmt(k)); return this; }
  public MapAssert<K, V> doesNotContainKey(K k) { notNull(); if (actual.containsKey(k)) throw failure("\nExpecting actual:\n  " + actual + "\nnot to contain key:\n  " + Assertions.__fmt(k)); return this; }
  public MapAssert<K, V> containsEntry(K k, V v) { notNull(); if (!actual.containsKey(k) || !java.util.Objects.equals(actual.get(k), v)) throw failure("\nExpecting actual:\n  " + actual + "\nto contain entry:\n  " + Assertions.__fmt(k) + "=" + Assertions.__fmt(v)); return this; }
  public MapAssert<K, V> containsValue(V v) { notNull(); if (!actual.containsValue(v)) throw failure("\nExpecting actual:\n  " + actual + "\nto contain value:\n  " + Assertions.__fmt(v)); return this; }
}

class OptionalAssert<T> extends AbstractAssert<OptionalAssert<T>, java.util.Optional<T>> {
  OptionalAssert(java.util.Optional<T> a) { super(a); }
  public OptionalAssert<T> isPresent() { notNull(); if (!actual.isPresent()) throw failure("\nExpecting Optional to contain a value but it was empty"); return this; }
  public OptionalAssert<T> isNotPresent() { return isEmpty(); }
  public OptionalAssert<T> isEmpty() { notNull(); if (actual.isPresent()) throw failure("\nExpecting an empty Optional but was containing value: " + Assertions.__fmt(actual.get())); return this; }
  public OptionalAssert<T> contains(T v) { isPresent(); if (!java.util.Objects.equals(actual.get(), v)) throw failure("\nExpecting Optional to contain:\n  " + Assertions.__fmt(v) + "\nbut contained:\n  " + Assertions.__fmt(actual.get())); return this; }
  public ObjectAssert<T> get() { isPresent(); return new ObjectAssert<T>(actual.get()); }
}

class ThrowableAssert extends AbstractAssert<ThrowableAssert, Throwable> {
  ThrowableAssert(Throwable a) { super(a); }
  public ThrowableAssert hasMessage(String m) { if (!java.util.Objects.equals(actual.getMessage(), m)) throw failure("\nExpecting message:\n  \"" + m + "\"\nbut was:\n  \"" + actual.getMessage() + "\""); return this; }
  public ThrowableAssert hasMessageContaining(String m) { String a = actual.getMessage(); if (a == null || !a.contains(m)) throw failure("\nExpecting message:\n  \"" + a + "\"\nto contain:\n  \"" + m + "\""); return this; }
  public ThrowableAssert hasMessageStartingWith(String m) { String a = actual.getMessage(); if (a == null || !a.startsWith(m)) throw failure("\nExpecting message:\n  \"" + a + "\"\nto start with:\n  \"" + m + "\""); return this; }
  public ThrowableAssert hasNoCause() { if (actual.getCause() != null) throw failure("\nExpecting no cause but was: " + actual.getCause()); return this; }
  public ThrowableAssert hasCauseInstanceOf(Class<? extends Throwable> t) { if (!t.isInstance(actual.getCause())) throw failure("\nExpecting cause of type: " + t.getName() + " but was: " + actual.getCause()); return this; }
  public ThrowableAssert isExactlyInstanceOf(Class<?> t) { if (actual.getClass() != t) throw failure("\nExpecting exactly: " + t.getName() + " but was: " + actual.getClass().getName()); return this; }
  public ThrowableAssert withMessage(String m) { return hasMessage(m); }
  public ThrowableAssert withMessageContaining(String m) { return hasMessageContaining(m); }
}

class NotThrownAssert {
  private final Throwable thrown;
  NotThrownAssert(Throwable t) { this.thrown = t; }
  public void doesNotThrowAnyException() { if (thrown != null) { AssertionFailedError e = new AssertionFailedError("\nExpecting code not to raise a throwable but caught:\n  " + thrown); e.initCause(thrown); throw e; } }
}

class ExceptionTypeAssert<T extends Throwable> {
  private final Class<T> type;
  ExceptionTypeAssert(Class<T> type) { this.type = type; }
  public ThrowableAssert isThrownBy(ThrowingCallable c) {
    try { c.call(); } catch (Throwable t) {
      if (!type.isInstance(t)) throw new AssertionFailedError("\nExpecting a throwable of type:\n  " + type.getName() + "\nbut was:\n  " + t);
      return new ThrowableAssert(t);
    }
    throw new AssertionFailedError("\nExpecting code to raise a throwable of type " + type.getName() + " but nothing was thrown");
  }
}

final class __JUnitLiteRunner {
  private static int passed = 0, failed = 0, skipped = 0;

  static String b64(String s) { return java.util.Base64.getEncoder().encodeToString((s == null ? "" : s).getBytes(java.nio.charset.StandardCharsets.UTF_8)); }

  static void report(String status, String cls, String name, long ms, String message) {
    System.out.flush();
    System.out.println("@@JLT\t" + status + "\t" + b64(cls) + "\t" + b64(name) + "\t" + ms + "\t" + b64(message));
    System.out.flush();
  }

  static final java.util.Set<String> SHIM = new java.util.HashSet<>(java.util.Arrays.asList(
    "Assertions", "AbstractAssert", "ObjectAssert", "BooleanAssert", "StringAssert", "NumberAssert", "IterableAssert",
    "MapAssert", "OptionalAssert", "ThrowableAssert", "NotThrownAssert", "ExceptionTypeAssert", "__JUnitLiteRunner", "Main", "Logger"));

  static String describe(Throwable t) {
    StringBuilder sb = new StringBuilder();
    sb.append(t instanceof AssertionError && t.getMessage() != null ? t.getMessage() : t.toString());
    int n = 0;
    for (StackTraceElement el : t.getStackTrace()) {
      String c = el.getClassName();
      String top = c.contains("$") ? c.substring(0, c.indexOf('$')) : c;
      if (SHIM.contains(top) || c.startsWith("java.") || c.startsWith("jdk.") || c.startsWith("sun.")) continue;
      sb.append("\n    at ").append(el.toString());
      if (++n >= 6) break;
    }
    Throwable cause = t.getCause();
    if (cause != null && cause != t) sb.append("\nCaused by: ").append(cause.toString());
    return sb.toString();
  }

  static java.util.List<java.lang.reflect.Method> methods(Class<?> c) {
    java.util.List<java.lang.reflect.Method> out = new java.util.ArrayList<>();
    java.util.List<Class<?>> chain = new java.util.ArrayList<>();
    for (Class<?> k = c; k != null && k != Object.class; k = k.getSuperclass()) {
      String n = k.getName();
      if (n.startsWith("java.") || n.startsWith("javax.") || n.startsWith("jdk.") || n.startsWith("sun.")) break;
      chain.add(0, k);
    }
    for (Class<?> k : chain) {
      java.lang.reflect.Method[] ms = k.getDeclaredMethods();
      java.util.Arrays.sort(ms, new java.util.Comparator<java.lang.reflect.Method>() {
        public int compare(java.lang.reflect.Method a, java.lang.reflect.Method b) { return a.getName().compareTo(b.getName()); }
      });
      for (java.lang.reflect.Method m : ms) {
        if (m.isSynthetic()) continue;
        try { m.setAccessible(true); } catch (RuntimeException inaccessible) { continue; }
        out.add(m);
      }
    }
    return out;
  }

  static boolean isTest(java.lang.reflect.Method m) {
    return m.isAnnotationPresent(Test.class) || m.isAnnotationPresent(ParameterizedTest.class) || m.isAnnotationPresent(RepeatedTest.class);
  }

  static Throwable unwrap(Throwable t) {
    while (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    return t;
  }

  static void invokeAll(java.util.List<java.lang.reflect.Method> all, Class<? extends java.lang.annotation.Annotation> a, Object target) throws Throwable {
    for (java.lang.reflect.Method m : all) if (m.isAnnotationPresent(a)) {
      try { m.invoke(target); } catch (Throwable t) { throw unwrap(t); }
    }
  }

  static String displayName(java.lang.reflect.Method m) {
    DisplayName d = m.getAnnotation(DisplayName.class);
    return d != null ? d.value() : m.getName() + "()";
  }

  // ---------- źródła parametrów ----------
  static java.util.List<Object[]> argumentSets(Class<?> cls, java.lang.reflect.Method m) throws Throwable {
    java.util.List<Object[]> sets = new java.util.ArrayList<>();
    if (m.isAnnotationPresent(NullSource.class)) sets.add(new Object[]{null});
    if (m.isAnnotationPresent(EmptySource.class)) {
      Class<?> p = m.getParameterTypes().length > 0 ? m.getParameterTypes()[0] : String.class;
      if (p == String.class) sets.add(new Object[]{""});
      else if (java.util.List.class.isAssignableFrom(p)) sets.add(new Object[]{new java.util.ArrayList<>()});
      else if (java.util.Set.class.isAssignableFrom(p)) sets.add(new Object[]{new java.util.HashSet<>()});
      else if (java.util.Map.class.isAssignableFrom(p)) sets.add(new Object[]{new java.util.HashMap<>()});
      else if (p.isArray()) sets.add(new Object[]{java.lang.reflect.Array.newInstance(p.getComponentType(), 0)});
    }
    ValueSource vs = m.getAnnotation(ValueSource.class);
    if (vs != null) {
      for (int v : vs.ints()) sets.add(new Object[]{v});
      for (long v : vs.longs()) sets.add(new Object[]{v});
      for (double v : vs.doubles()) sets.add(new Object[]{v});
      for (String v : vs.strings()) sets.add(new Object[]{v});
      for (boolean v : vs.booleans()) sets.add(new Object[]{v});
      for (char v : vs.chars()) sets.add(new Object[]{v});
    }
    CsvSource cs = m.getAnnotation(CsvSource.class);
    if (cs != null) for (String row : cs.value()) sets.add(parseCsv(row, cs.delimiter()));
    MethodSource ms = m.getAnnotation(MethodSource.class);
    if (ms != null) {
      String[] names = ms.value().length == 0 ? new String[]{m.getName()} : ms.value();
      for (String name : names) {
        java.lang.reflect.Method src = cls.getDeclaredMethod(name);
        src.setAccessible(true);
        Object res;
        try { res = src.invoke(null); } catch (Throwable t) { throw unwrap(t); }
        java.util.Iterator<?> it;
        if (res instanceof java.util.stream.BaseStream) it = ((java.util.stream.BaseStream<?, ?>) res).iterator();
        else if (res instanceof Iterable) it = ((Iterable<?>) res).iterator();
        else if (res instanceof Object[]) it = java.util.Arrays.asList((Object[]) res).iterator();
        else throw new IllegalStateException("@MethodSource " + name + " musi zwracać Stream, Iterable lub tablicę");
        while (it.hasNext()) {
          Object o = it.next();
          if (o instanceof Arguments) sets.add(((Arguments) o).get());
          else if (o instanceof Object[] && m.getParameterCount() > 1) sets.add((Object[]) o);
          else sets.add(new Object[]{o});
        }
      }
    }
    return sets;
  }

  static Object[] parseCsv(String row, char delim) {
    java.util.List<Object> out = new java.util.ArrayList<>();
    StringBuilder cur = new StringBuilder();
    boolean inQuote = false, quoted = false;
    for (int i = 0; i < row.length(); i++) {
      char ch = row.charAt(i);
      if (ch == '\'') {
        if (inQuote && i + 1 < row.length() && row.charAt(i + 1) == '\'') { cur.append('\''); i++; }
        else { if (!inQuote && cur.toString().trim().isEmpty()) cur.setLength(0); inQuote = !inQuote; quoted = true; }
      } else if (ch == delim && !inQuote) { out.add(cell(cur.toString(), quoted)); cur.setLength(0); quoted = false; }
      else if (quoted && !inQuote && Character.isWhitespace(ch)) { /* spacje po zamknięciu cudzysłowu */ }
      else cur.append(ch);
    }
    out.add(cell(cur.toString(), quoted));
    return out.toArray();
  }

  static Object cell(String raw, boolean quoted) {
    if (quoted) return raw;
    String t = raw.trim();
    return t.isEmpty() ? null : t;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  static Object convert(Object v, Class<?> type) {
    if (v == null) {
      if (type.isPrimitive()) throw new IllegalArgumentException("null nie może być przekazany jako " + type.getName());
      return null;
    }
    Class<?> box = type.isPrimitive() ? java.lang.invoke.MethodType.methodType(type).wrap().returnType() : type;
    if (box.isInstance(v)) return v;
    if (v instanceof Number) {
      Number n = (Number) v;
      if (box == Long.class) return n.longValue();
      if (box == Integer.class) return n.intValue();
      if (box == Double.class) return n.doubleValue();
      if (box == Float.class) return n.floatValue();
      if (box == Short.class) return n.shortValue();
      if (box == Byte.class) return n.byteValue();
      if (box == String.class) return String.valueOf(v);
    }
    String s = String.valueOf(v);
    if (box == String.class) return s;
    if (box == Integer.class) return Integer.parseInt(s);
    if (box == Long.class) return Long.parseLong(s);
    if (box == Double.class) return Double.parseDouble(s);
    if (box == Float.class) return Float.parseFloat(s);
    if (box == Short.class) return Short.parseShort(s);
    if (box == Byte.class) return Byte.parseByte(s);
    if (box == Boolean.class) return Boolean.parseBoolean(s);
    if (box == Character.class && s.length() == 1) return s.charAt(0);
    if (box == java.math.BigDecimal.class) return new java.math.BigDecimal(s);
    if (box.isEnum()) return Enum.valueOf((Class) box, s);
    return v;
  }

  static String argsLabel(Object[] args) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < args.length; i++) { if (i > 0) sb.append(", "); sb.append(args[i] instanceof String ? args[i] : String.valueOf(args[i])); }
    return sb.toString();
  }

  static void runOne(Class<?> cls, java.util.List<java.lang.reflect.Method> all, java.lang.reflect.Method m, String clsLabel, String label, Object[] args) {
    long start = System.nanoTime();
    Object inst = null;
    Throwable error = null;
    try {
      if (!java.lang.reflect.Modifier.isStatic(m.getModifiers())) {
        java.lang.reflect.Constructor<?> ctor = cls.getDeclaredConstructor();
        ctor.setAccessible(true);
        inst = ctor.newInstance();
      }
      invokeAll(all, BeforeEach.class, inst);
      Class<?>[] pt = m.getParameterTypes();
      Object[] callArgs = new Object[pt.length];
      for (int i = 0; i < pt.length; i++) callArgs[i] = i < args.length ? convert(args[i], pt[i]) : null;
      m.invoke(inst, callArgs);
    } catch (Throwable t) { error = unwrap(t); }
    try { if (inst != null || error == null) invokeAll(all, AfterEach.class, inst); }
    catch (Throwable t) { if (error == null) error = t; }
    long ms = (System.nanoTime() - start) / 1_000_000;
    if (error == null) { passed++; report("PASSED", clsLabel, label, ms, ""); }
    else { failed++; report(error instanceof AssertionError ? "FAILED" : "ERROR", clsLabel, label, ms, describe(error)); }
  }

  static boolean runClass(Class<?> cls) {
    java.util.List<java.lang.reflect.Method> all = methods(cls);
    boolean hasTests = false;
    for (java.lang.reflect.Method m : all) if (isTest(m)) { hasTests = true; break; }
    if (!hasTests) return false;
    DisplayName cd = cls.getAnnotation(DisplayName.class);
    String clsLabel = cd != null ? cd.value() : cls.getSimpleName();
    if (cls.isAnnotationPresent(Disabled.class)) {
      for (java.lang.reflect.Method m : all) if (isTest(m)) { skipped++; report("SKIPPED", clsLabel, displayName(m), 0, cls.getAnnotation(Disabled.class).value()); }
      return true;
    }
    try { invokeAll(all, BeforeAll.class, null); }
    catch (Throwable t) {
      for (java.lang.reflect.Method m : all) if (isTest(m)) { failed++; report("ERROR", clsLabel, displayName(m), 0, "@BeforeAll nie powiódł się: " + describe(t)); }
      return true;
    }
    for (java.lang.reflect.Method m : all) {
      if (!isTest(m)) continue;
      String label = displayName(m);
      if (m.isAnnotationPresent(Disabled.class)) { skipped++; report("SKIPPED", clsLabel, label, 0, m.getAnnotation(Disabled.class).value()); continue; }
      if (m.isAnnotationPresent(ParameterizedTest.class)) {
        java.util.List<Object[]> sets;
        try { sets = argumentSets(cls, m); }
        catch (Throwable t) { failed++; report("ERROR", clsLabel, label, 0, "Nie udało się przygotować parametrów: " + describe(t)); continue; }
        if (sets.isEmpty()) { failed++; report("ERROR", clsLabel, label, 0, "@ParameterizedTest bez źródła parametrów (@ValueSource, @CsvSource, @MethodSource…)"); continue; }
        String pattern = m.getAnnotation(ParameterizedTest.class).name();
        for (int i = 0; i < sets.size(); i++) {
          Object[] a = sets.get(i);
          String name;
          if (pattern.isEmpty()) name = label + " [" + (i + 1) + "] " + argsLabel(a);
          else {
            name = pattern.replace("{index}", String.valueOf(i + 1)).replace("{arguments}", argsLabel(a)).replace("{displayName}", label);
            for (int j = 0; j < a.length; j++) name = name.replace("{" + j + "}", String.valueOf(a[j]));
            name = "[" + (i + 1) + "] " + name;
          }
          runOne(cls, all, m, clsLabel, name, a);
        }
      } else if (m.isAnnotationPresent(RepeatedTest.class)) {
        int n = m.getAnnotation(RepeatedTest.class).value();
        for (int i = 1; i <= n; i++) runOne(cls, all, m, clsLabel, label + " powtórzenie " + i + "/" + n, new Object[0]);
      } else {
        runOne(cls, all, m, clsLabel, label, new Object[0]);
      }
    }
    try { invokeAll(all, AfterAll.class, null); }
    catch (Throwable t) { failed++; report("ERROR", clsLabel, "@AfterAll", 0, describe(t)); }
    return true;
  }

  static void run(String[] classNames) throws Throwable {
    try {
      System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8"));
      System.setErr(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8"));
    } catch (java.io.UnsupportedEncodingException ignored) { }
    // Gradle uruchamia testy w wątku „Test worker” – ta sama nazwa trafia do logów (wzorzec logback %thread).
    Thread.currentThread().setName("Test worker");
    boolean any = false;
    for (String n : classNames) {
      Class<?> c;
      try { c = Class.forName(n); } catch (ClassNotFoundException e) { continue; }
      if (c.isInterface() || c.isAnnotation() || java.lang.reflect.Modifier.isAbstract(c.getModifiers())) continue;
      any |= runClass(c);
    }
    if (!any) {
      for (String n : classNames) {
        Class<?> c;
        try { c = Class.forName(n); } catch (ClassNotFoundException e) { continue; }
        java.lang.reflect.Method main;
        try { main = c.getDeclaredMethod("main", String[].class); } catch (NoSuchMethodException e) { continue; }
        if (!java.lang.reflect.Modifier.isStatic(main.getModifiers())) continue;
        main.setAccessible(true);
        Thread.currentThread().setName("main");
        System.out.println("@@JLT_MODE\tMAIN\t" + b64(n));
        try { main.invoke(null, (Object) new String[0]); } catch (Throwable t) { throw unwrap(t); }
        return;
      }
      System.out.println("@@JLT_MODE\tNONE\t");
      return;
    }
    System.out.println("@@JLT_DONE\t" + passed + "\t" + failed + "\t" + skipped);
  }
}
