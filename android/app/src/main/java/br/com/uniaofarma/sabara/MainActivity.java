package br.com.uniaofarma.sabara;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.LruCache;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.text.DateFormat;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

import static br.com.uniaofarma.sabara.LojaApi.BRASIL;

public final class MainActivity extends Activity {
    private static final int VERDE = 0xff006243;
    private static final int ESCURO = 0xff14332a;
    private static final int NEUTRO = 0xff456359;
    private static final int FUNDO = 0xfff4f7f4;
    private static final int MENTA = 0xffe3f2e9;
    private static final int ERRO = 0xff864121;
    private static final int MAX_LARGURA_DP = 760;

    private enum Tela { INICIO, PRODUTOS, CESTA, RECENTES, DETALHES, RECEITA }

    private final LojaApi api = new LojaApi();
    private final NumberFormat reais = NumberFormat.getCurrencyInstance(BRASIL);
    private final java.util.concurrent.ExecutorService rede = Executors.newSingleThreadExecutor();
    private final java.util.concurrent.ExecutorService imagens = Executors.newFixedThreadPool(3);
    private final LruCache<String, android.graphics.Bitmap> fotos = new LruCache<>(12 * 1024 * 1024) {
        @Override protected int sizeOf(String chave, android.graphics.Bitmap foto) {
            return foto.getByteCount();
        }
    };
    private CestasLocais local;
    private LojaApi.Catalogo catalogo;
    private Map<String, Integer> ofertas = Collections.emptyMap();
    /** Vitrines da home (mesmos critérios do site), carregadas junto com o catálogo. */
    private Map<String, List<LojaApi.Destaque>> vitrines = Collections.emptyMap();
    /** "Combina com" do produto aberto na ficha; `combinaDe` diz de qual produto é a lista. */
    private String combinaDe;
    private List<LojaApi.Relacionado> combinaAtual = Collections.emptyList();
    private boolean combinaCarregando;
    /** Filtros da lista de produtos (facetas do site): seções com os valores marcados. Preço máximo em centavos (0 = sem limite). */
    private final Map<String, java.util.Set<String>> filtrosSel = new LinkedHashMap<>();
    private List<LojaApi.FacetaFiltro> facetasAtuais = Collections.emptyList();
    private List<String> idsFiltrados;
    private String chaveFiltro;
    private int precoMaxFiltro;
    /** Navegue por categoria (mesma lista e mesmas buscas do site): rótulo, termo de busca e imagem. */
    private static final String[][] CATEGORIAS = {
            {"Cuidados com diabetes", "diabetes", "/categorias/diabetes.jpg"},
            {"Cuidados com o coração", "coração", "/categorias/coracao.jpg"},
            {"Cuidados com o estômago", "estômago", "/categorias/estomago.jpg"},
            {"Cuidados com o fígado", "fígado", "/categorias/figado.jpg"},
            {"Cuidados com os ossos", "ossos", "/categorias/ossos.jpg"},
            {"Cuidados com os rins", "rins", "/categorias/rins.jpg"},
            {"Derma Cuidados", "dep:dermocosmeticos", "/categorias/derma-usuario.jpg"},
            {"Cuidados Respiratórios", "respiratórios", "/categorias/respiratorios-usuario.jpg"},
            {"Cuidados com os olhos", "olhos", "/categorias/olhos.jpg"},
    };
    private static final String[][] VITRINES = {
            {"Cuidado Diário", "grupo=cuidado-diario"},
            {"Farmax", "lab=FARMAX"},
            {"Dermocosméticos", "grupo=dermocosmeticos"},
            {"Medicamentos", "grupo=medicamentos"},
            {"Bem Estar", "grupo=bem-estar"},
            {"Dove", "lab=DOVE"},
            {"Até R$ 10,00", "ate=1000"},
    };
    private Map<String, Integer> cesta;
    private Tela tela = Tela.INICIO;
    private String produtoAberto;
    private String busca = "";
    private String departamento;
    private String unidadeId;
    private String bairro;
    private boolean vendoOfertas;
    private boolean entrega;
    private boolean carregando;
    private boolean sincronizado;
    private boolean falhaOfertas;
    private boolean enviando;
    private String aviso;
    private LinearLayout raiz;
    private ScrollView painelRolavel;
    private Tela telaRenderizada;
    private AbsListView listaRenderizada;
    private int primeiroProduto;
    private int deslocamentoProduto;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        local = new CestasLocais(this);
        cesta = local.cesta();
        if (estado != null) {
            tela = Tela.valueOf(estado.getString("tela", Tela.INICIO.name()));
            produtoAberto = estado.getString("produto");
            departamento = estado.getString("departamento");
            vendoOfertas = estado.getBoolean("ofertas");
        }
        carregar(true);
    }

    @Override protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        estado.putString("tela", enviando ? Tela.CESTA.name() : tela.name());
        estado.putString("produto", produtoAberto);
        estado.putString("departamento", departamento);
        estado.putBoolean("ofertas", vendoOfertas);
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        rede.shutdown();
        imagens.shutdownNow();
    }

    @Override public void onBackPressed() {
        if (enviando) return;
        if (tela != Tela.INICIO) navegar(Tela.INICIO);
        else super.onBackPressed();
    }

    private void carregar(boolean lerCache) {
        if (carregando || enviando) return;
        carregando = true;
        mostrar();
        rede.execute(() -> {
            if (lerCache) {
                try {
                    LojaApi.Catalogo guardado = LojaApi.Catalogo.ler(local.lerCatalogo());
                    atualizarTela(() -> catalogo = guardado);
                } catch (IOException | JSONException e) {
                    // Na primeira visita o cache pode estar vazio.
                }
            }
            try {
                JSONObject json = api.catalogo();
                LojaApi.Catalogo novo = LojaApi.Catalogo.ler(json);
                try {
                    local.guardarCatalogo(json);
                } catch (IOException e) {
                    // A consulta desta sessão continua válida mesmo sem cache em disco.
                }
                atualizarTela(() -> {
                    catalogo = novo;
                    sincronizado = true;
                    if (unidade() == null || (entrega && bairroSelecionado() == null)) {
                        entrega = false;
                        bairro = null;
                    }
                });
            } catch (IOException | JSONException e) {
                atualizarTela(() -> {
                    sincronizado = false;
                    falhaOfertas = true;
                    carregando = false;
                });
                return;
            }
            try {
                Map<String, Integer> novasOfertas = api.ofertas();
                atualizarTela(() -> {
                    ofertas = novasOfertas;
                    falhaOfertas = false;
                    carregando = false;
                });
            } catch (IOException | JSONException e) {
                atualizarTela(() -> {
                    falhaOfertas = true;
                    carregando = false;
                });
            }
            var novasVitrines = new java.util.LinkedHashMap<String, List<LojaApi.Destaque>>();
            for (String[] vitrine : VITRINES) {
                try {
                    novasVitrines.put(vitrine[0], api.destaques(vitrine[1]));
                } catch (IOException | JSONException e) {
                    // Uma vitrine que falha não derruba as outras nem a loja.
                }
            }
            atualizarTela(() -> vitrines = novasVitrines);
        });
    }

    private void atualizarTela(Runnable alterar) {
        runOnUiThread(() -> {
            if (isDestroyed() || isFinishing()) return;
            alterar.run();
            mostrar();
        });
    }

    private void navegar(Tela destino) {
        if (enviando) return;
        tela = destino;
        aviso = null;
        esconderTeclado();
        mostrar();
    }

    private void esconderTeclado() {
        if (raiz != null) getSystemService(InputMethodManager.class).hideSoftInputFromWindow(raiz.getWindowToken(), 0);
    }

    private LojaApi.Unidade unidade() {
        if (catalogo == null || catalogo.unidades().isEmpty()) return null;
        for (LojaApi.Unidade unit : catalogo.unidades()) if (unit.id().equals(unidadeId)) return unit;
        return catalogo.unidades().get(0);
    }

    private LojaApi.Bairro bairroSelecionado() {
        LojaApi.Unidade unit = unidade();
        if (unit == null) return null;
        for (LojaApi.Bairro area : unit.bairros()) if (area.nome().equals(bairro)) return area;
        return null;
    }

    private LojaApi.Produto produto(String id) {
        return catalogo == null ? null : catalogo.produtos().get(id);
    }

    private boolean conectado() {
        return getSystemService(ConnectivityManager.class).getActiveNetwork() != null;
    }

    private void mostrar() {
        int rolagemAnterior = tela == telaRenderizada && painelRolavel != null ? painelRolavel.getScrollY() : 0;
        painelRolavel = null;
        if (listaRenderizada != null) {
            primeiroProduto = listaRenderizada.getFirstVisiblePosition();
            deslocamentoProduto = listaRenderizada.getChildCount() > 0 ? listaRenderizada.getChildAt(0).getTop() : 0;
            listaRenderizada = null;
        }
        telaRenderizada = tela;
        raiz = coluna();
        raiz.setBackgroundColor(FUNDO);
        FrameLayout moldura = new FrameLayout(this) {
            @Override protected void onMeasure(int largura, int altura) {
                int larguraUtil = MeasureSpec.getSize(largura) - getPaddingLeft() - getPaddingRight();
                int limite = Math.min(Math.max(0, larguraUtil), dp(MAX_LARGURA_DP));
                getChildAt(0).getLayoutParams().width = limite;
                super.onMeasure(largura, altura);
            }
        };
        moldura.setBackgroundColor(FUNDO);
        moldura.addView(raiz, new FrameLayout.LayoutParams(-1, -1, Gravity.TOP | Gravity.CENTER_HORIZONTAL));
        moldura.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                var espaco = insets.getInsets(android.view.WindowInsets.Type.systemBars()
                        | android.view.WindowInsets.Type.displayCutout() | android.view.WindowInsets.Type.ime());
                view.setPadding(espaco.left, espaco.top, espaco.right, espaco.bottom);
                return android.view.WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(moldura);
        moldura.requestApplyInsets();
        cabecalho();

        if (tela == Tela.PRODUTOS) {
            produtos();
        } else {
            ScrollView rolagem = new ScrollView(this);
            painelRolavel = rolagem;
            rolagem.setFillViewport(true);
            LinearLayout conteudo = coluna();
            padding(conteudo, 16, 16, 16, 24);
            rolagem.addView(conteudo);
            raiz.addView(rolagem, new LinearLayout.LayoutParams(-1, 0, 1));
            estadoRede(conteudo);
            switch (tela) {
                case INICIO -> inicio(conteudo);
                case CESTA -> cesta(conteudo);
                case RECENTES -> recentes(conteudo);
                case DETALHES -> detalhes(conteudo);
                case RECEITA -> receita(conteudo);
            }
            if (rolagemAnterior > 0 && aviso == null) rolagem.post(() -> rolagem.scrollTo(0, rolagemAnterior));
        }
        navegacao();
    }

    private void cabecalho() {
        LinearLayout topo = new LinearLayout(this);
        topo.setGravity(Gravity.CENTER_VERTICAL);
        topo.setBackgroundColor(0xff004a35);
        padding(topo, 20, 14, 20, 13);
        LinearLayout marca = coluna();
        marca.addView(texto("União Farma", 23, Color.WHITE, true));
        if (unidade() != null) marca.addView(texto(unidade().nome(), 14, 0xffdaf4e6, false));
        topo.addView(marca, new LinearLayout.LayoutParams(0, -2, 1));
        if (tela == Tela.PRODUTOS && sincronizado) {
            Button atualizar = botao("Atualizar", false, () -> carregar(false));
            atualizar.setContentDescription("Atualizar catálogo");
            atualizar.setEnabled(!carregando);
            topo.addView(atualizar);
        }
        raiz.addView(topo);
    }

    private void navegacao() {
        LinearLayout barra = new LinearLayout(this);
        barra.setBackgroundColor(Color.WHITE);
        padding(barra, 8, 5, 8, 5);
        String quantidade = cesta.isEmpty() ? "" : " (" + cesta.values().stream().mapToInt(Integer::intValue).sum() + ")";
        aba(barra, "Início", Tela.INICIO, false);
        aba(barra, "Produtos", Tela.PRODUTOS, tela == Tela.DETALHES);
        aba(barra, "Cesta" + quantidade, Tela.CESTA, false);
        aba(barra, "Recentes", Tela.RECENTES, false);
        raiz.addView(barra);
    }

    private void aba(LinearLayout pai, String rotulo, Tela alvo, boolean secundaria) {
        boolean ativa = tela == alvo || secundaria;
        Button botao = botao(rotulo, ativa, () -> navegar(alvo));
        botao.setSelected(ativa);
        botao.setEnabled(!enviando);
        var lp = new LinearLayout.LayoutParams(0, -2, 1);
        lp.setMargins(dp(3), 0, dp(3), 0);
        pai.addView(botao, lp);
    }

    private void estadoRede(LinearLayout pai) {
        if (aviso != null) estado(pai, aviso);
        if (carregando) {
            estado(pai, "Atualizando o catálogo…");
        } else if (!sincronizado) {
            String mensagem = conectado() ? "Não foi possível atualizar o catálogo." : "Sem conexão com a internet.";
            if (catalogo != null) mensagem += " Você está vendo a última consulta.";
            estado(pai, mensagem);
            acao(pai, "Tentar novamente", false, true, () -> carregar(false));
        }
    }

    private void produtos() {
        LinearLayout filtros = coluna();
        padding(filtros, 16, 14, 16, 6);
        raiz.addView(filtros);
        estadoRede(filtros);
        if (catalogo == null) {
            raiz.addView(new View(this), new LinearLayout.LayoutParams(-1, 0, 1));
            return;
        }
        if (unidade() == null) {
            estado(filtros, "Nenhuma unidade está disponível para pedidos.");
            acao(filtros, "Atualizar", false, !carregando, () -> carregar(false));
            raiz.addView(new View(this), new LinearLayout.LayoutParams(-1, 0, 1));
            return;
        }

        EditText campo = new EditText(this);
        campo.setHint("Buscar produto ou marca");
        campo.setContentDescription("Buscar produto ou marca");
        campo.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
        campo.setTextSize(16);
        campo.setSingleLine(true);
        campo.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH);
        campo.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        campo.setBackground(fundo(Color.WHITE, 14));
        campo.setMinHeight(dp(50));
        padding(campo, 14, 5, 14, 5);
        campo.setText(busca);
        campo.setSelection(busca.length());
        filtros.addView(campo);
        campo.setOnEditorActionListener((v, action, event) -> {
            esconderTeclado();
            return true;
        });

        LinearLayout opcoes = new LinearLayout(this);
        filtros.addView(opcoes);
        Button categorias = botao(departamento == null ? "Departamentos" : nomeDepartamento(departamento), false, this::escolherDepartamento);
        categorias.setContentDescription("Departamentos. " + (departamento == null ? "Todos" : nomeDepartamento(departamento)));
        categorias.setEnabled(!vendoOfertas);
        opcoes.addView(categorias, new LinearLayout.LayoutParams(0, -2, 3));
        Button ofertasBotao = botao("Ofertas", vendoOfertas, () -> {
            vendoOfertas = !vendoOfertas;
            esconderTeclado();
            listaRenderizada = null;
            primeiroProduto = deslocamentoProduto = 0;
            mostrar();
        });
        ofertasBotao.setSelected(vendoOfertas);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, -2, 2);
        lp.setMarginStart(dp(8));
        opcoes.addView(ofertasBotao, lp);
        LinearLayout filtrosLinha = new LinearLayout(this);
        filtros.addView(filtrosLinha);
        int selecionados = contarSelecoes();
        Button filtrosBotao = botao(selecionados == 0 ? "Filtros" : "Filtros · " + selecionados, selecionados > 0, this::abrirFiltros);
        filtrosBotao.setEnabled(!vendoOfertas);
        filtrosBotao.setContentDescription("Filtros. " + (selecionados == 0 ? "Nenhum ativo" : selecionados + " ativos"));
        filtrosLinha.addView(filtrosBotao, new LinearLayout.LayoutParams(0, -2, 1));
        Button precoBotao = botao(precoMaxFiltro == 0 ? "Preço" : "Até " + moeda(precoMaxFiltro), precoMaxFiltro > 0, this::escolherPreco);
        precoBotao.setEnabled(!vendoOfertas);
        LinearLayout.LayoutParams lpPreco = new LinearLayout.LayoutParams(0, -2, 1);
        lpPreco.setMarginStart(dp(8));
        filtrosLinha.addView(precoBotao, lpPreco);
        if (vendoOfertas && falhaOfertas && !carregando && sincronizado) {
            estado(filtros, "As ofertas estão indisponíveis agora.");
            acao(filtros, "Atualizar", false, true, () -> carregar(false));
        }

        TextView contagem = texto("", 14, NEUTRO, true);
        contagem.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        padding(contagem, 2, 9, 0, 0);
        filtros.addView(contagem);
        // Grade de duas colunas, como a lista de produtos do site.
        GridView lista = new GridView(this);
        listaRenderizada = lista;
        lista.setNumColumns(2);
        lista.setStretchMode(GridView.STRETCH_COLUMN_WIDTH);
        lista.setHorizontalSpacing(dp(8));
        lista.setVerticalSpacing(dp(8));
        lista.setClipToPadding(false);
        padding(lista, 16, 0, 16, 10);
        raiz.addView(lista, new LinearLayout.LayoutParams(-1, 0, 1));
        ProdutoAdapter adapter = new ProdutoAdapter();
        lista.setAdapter(adapter);
        lista.setOnItemClickListener((p, v, position, id) -> {
            produtoAberto = adapter.getItem(position).id();
            navegar(Tela.DETALHES);
        });
        java.util.function.Consumer<List<LojaApi.Produto>> exibir = encontrados -> {
            adapter.itens = encontrados;
            adapter.notifyDataSetChanged();
            lista.setSelection(0);
            int total = encontrados.size();
            contagem.setText(total == 0 ? (vendoOfertas && carregando ? "Buscando ofertas…"
                    : vendoOfertas && (!sincronizado || falhaOfertas) ? "" : "Nenhum produto encontrado.")
                    : total == 1 ? "1 produto" : total + " produtos");
        };
        Runnable filtrar = () -> {
            if (usaFiltroServidor()) {
                if (idsFiltrados == null || !chaveAtual().equals(chaveFiltro)) {
                    contagem.setText("Filtrando…");
                    adapter.itens = Collections.emptyList();
                    adapter.notifyDataSetChanged();
                    atualizarFiltroServidor(null);
                    return;
                }
                var encontrados = new ArrayList<LojaApi.Produto>();
                for (String id : idsFiltrados) {
                    LojaApi.Produto p = produto(id);
                    if (p != null) encontrados.add(p);
                }
                exibir.accept(encontrados);
                return;
            }
            String consulta = LojaApi.textoBusca(busca);
            String[] termos = consulta.isEmpty() ? new String[0] : consulta.split(" ");
            var encontrados = new ArrayList<LojaApi.Produto>();
            for (LojaApi.Produto item : catalogo.produtos().values()) {
                if (vendoOfertas ? !emOferta(item) : departamento != null && !departamento.equals(item.departamento())) continue;
                if (casa(item.busca(), termos)) encontrados.add(item);
            }
            exibir.accept(encontrados);
        };
        campo.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                busca = s.toString();
                filtrar.run();
            }
            @Override public void afterTextChanged(Editable editable) {}
        });
        filtros.setFocusableInTouchMode(true);
        filtros.requestFocus();
        filtrar.run();
        lista.setSelectionFromTop(primeiroProduto, deslocamentoProduto);
    }

    private static boolean casa(String indice, String[] termos) {
        for (String termo : termos) {
            boolean inteiro = termo.length() <= 2 || Character.isDigit(termo.charAt(0));
            if (inteiro ? !(" " + indice + " ").contains(" " + termo + " ") : !indice.contains(termo)) return false;
        }
        return true;
    }

    /** Início: banners da home e atalhos para os departamentos e as ofertas. Os banners vêm do mesmo catálogo da API. */
    private void inicio(LinearLayout pai) {
        if (catalogo == null) {
            estado(pai, "Carregando a loja…");
            return;
        }
        if (!catalogo.banners().isEmpty()) {
            // Banners na horizontal, como o carrossel do site: largura da tela e proporção 949 : 239.
            // Um banner por vez: cada um ocupa a largura da faixa e a faixa para no banner mais próximo ao soltar o dedo.
            HorizontalScrollView faixa = new HorizontalScrollView(this);
            faixa.setHorizontalScrollBarEnabled(false);
            LinearLayout linha = new LinearLayout(this);
            linha.setOrientation(LinearLayout.HORIZONTAL);
            var imagens = new ArrayList<ImageView>();
            for (LojaApi.Banner banner : catalogo.banners()) {
                ImageView imagem = new ImageView(this);
                imagem.setScaleType(ImageView.ScaleType.FIT_CENTER);
                linha.addView(imagem, new LinearLayout.LayoutParams(dp(300), dp(120)));
                imagens.add(imagem);
                carregarFoto(imagem, banner.url(), "Banner da loja");
            }
            faixa.addView(linha);
            faixa.post(() -> {
                int largura = faixa.getWidth();
                if (largura <= 0) return;
                int altura = largura * 239 / 949;
                for (ImageView imagem : imagens) imagem.setLayoutParams(new LinearLayout.LayoutParams(largura, altura));
            });
            faixa.setOnTouchListener((v, evento) -> {
                if (evento.getAction() == MotionEvent.ACTION_UP || evento.getAction() == MotionEvent.ACTION_CANCEL) {
                    int largura = faixa.getWidth();
                    if (largura > 0) {
                        int alvo = Math.round(faixa.getScrollX() / (float) largura) * largura;
                        faixa.post(() -> faixa.smoothScrollTo(alvo, 0));
                    }
                }
                return false;
            });
            var lpFaixa = new LinearLayout.LayoutParams(-1, -2);
            lpFaixa.bottomMargin = dp(12);
            pai.addView(faixa, lpFaixa);
        }
        titulo(pai, "Departamentos");
        pai.addView(atalho("Ver ofertas", () -> abrirProdutos(null, true)));
        pai.addView(atalho("Enviar receita por foto", this::escolherFotoReceita));
        for (LojaApi.Departamento d : catalogo.departamentos()) {
            String slug = d.slug();
            pai.addView(atalho(d.nome(), () -> abrirProdutos(slug, false)));
        }
        titulo(pai, "Navegue por categoria");
        pai.addView(categoriasLinha());
        for (String[] vitrine : VITRINES) {
            List<LojaApi.Destaque> itens = vitrines.get(vitrine[0]);
            if (itens == null || itens.isEmpty()) continue;
            titulo(pai, vitrine[0]);
            pai.addView(vitrineLinha(itens));
        }
    }

    /** Carrossel "Navegue por categoria": cartões com foto e rótulo; tocar abre a busca (ou o departamento, como no site). */
    private View categoriasLinha() {
        HorizontalScrollView rolagem = new HorizontalScrollView(this);
        rolagem.setHorizontalScrollBarEnabled(false);
        LinearLayout linha = new LinearLayout(this);
        linha.setOrientation(LinearLayout.HORIZONTAL);
        for (String[] categoria : CATEGORIAS) {
            LinearLayout cartao = coluna();
            cartao.setGravity(Gravity.CENTER_HORIZONTAL);
            cartao.setClickable(true);
            cartao.setFocusable(true);
            ImageView foto = new ImageView(this);
            foto.setScaleType(ImageView.ScaleType.CENTER_CROP);
            foto.setBackground(fundo(FUNDO, 12));
            cartao.addView(foto, new LinearLayout.LayoutParams(dp(112), dp(168)));
            carregarFoto(foto, categoria[2], null);
            TextView rotulo = texto(categoria[0], 13, ESCURO, true);
            rotulo.setGravity(Gravity.CENTER_HORIZONTAL);
            rotulo.setMaxLines(2);
            cartao.addView(rotulo, new LinearLayout.LayoutParams(dp(112), -2));
            String destino = categoria[1];
            cartao.setOnClickListener(v -> {
                if (destino.startsWith("dep:")) abrirProdutos(destino.substring(4), false);
                else abrirBusca(destino);
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(112), -2);
            lp.setMargins(0, 0, dp(10), dp(4));
            linha.addView(cartao, lp);
        }
        rolagem.addView(linha);
        return rolagem;
    }

    /** Linha horizontal de cartões; tocar num cartão abre a busca pelo nome do produto. */
    private View vitrineLinha(List<LojaApi.Destaque> itens) {
        HorizontalScrollView rolagem = new HorizontalScrollView(this);
        rolagem.setHorizontalScrollBarEnabled(false);
        LinearLayout linha = new LinearLayout(this);
        linha.setOrientation(LinearLayout.HORIZONTAL);
        for (LojaApi.Destaque destaque : itens) {
            LinearLayout cartao = coluna();
            cartao.setBackground(fundo(Color.WHITE, 15));
            padding(cartao, 8, 8, 8, 8);
            cartao.setClickable(true);
            cartao.setFocusable(true);
            ImageView foto = new ImageView(this);
            foto.setScaleType(ImageView.ScaleType.FIT_CENTER);
            cartao.addView(foto, new LinearLayout.LayoutParams(dp(120), dp(120)));
            carregarFoto(foto, destaque.foto(), destaque.nome());
            TextView nome = texto(destaque.nome(), 13, ESCURO, false);
            nome.setMaxLines(2);
            cartao.addView(nome, new LinearLayout.LayoutParams(-1, -2));
            cartao.addView(texto(moeda(destaque.precoCentavos()), 15, VERDE, true), new LinearLayout.LayoutParams(-1, -2));
            cartao.setOnClickListener(v -> abrirBusca(destaque.nome()));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(136), -2);
            lp.setMargins(0, 0, dp(10), dp(4));
            linha.addView(cartao, lp);
        }
        rolagem.addView(linha);
        return rolagem;
    }

    // ---- Receita por foto -------------------------------------------------------------------------------------------
    // A foto só existe na memória durante o envio. O servidor lê com a mesma IA do site e casa com o catálogo.
    private static final int CODIGO_RECEITA = 7;
    private static final int TAMANHO_MAX_RECEITA = 3 * 1024 * 1024;
    private LojaApi.LeituraReceita leitura;
    private boolean lendoReceita;
    private String erroReceita;

    private void escolherFotoReceita() {
        Intent escolha = new Intent(Intent.ACTION_GET_CONTENT);
        escolha.setType("image/*");
        startActivityForResult(Intent.createChooser(escolha, "Foto da receita"), CODIGO_RECEITA);
    }

    @Override protected void onActivityResult(int codigo, int resultado, Intent dados) {
        super.onActivityResult(codigo, resultado, dados);
        if (codigo != CODIGO_RECEITA || resultado != RESULT_OK || dados == null || dados.getData() == null) return;
        Uri uri = dados.getData();
        lendoReceita = true;
        leitura = null;
        erroReceita = null;
        tela = Tela.RECEITA;
        mostrar();
        rede.execute(() -> {
            LojaApi.LeituraReceita nova = null;
            String erro = null;
            try {
                byte[] imagem = prepararReceita(uri);
                if (imagem == null) {
                    erro = "A foto está muito grande ou não pôde ser lida. Tente outra foto.";
                } else {
                    nova = api.lerReceita(imagem, "image/jpeg");
                }
            } catch (LojaApi.FalhaHttp e) {
                erro = e.status == 429 ? "Muitas leituras agora. Tente de novo em alguns minutos."
                        : e.status == 413 ? "A foto está muito grande. Tente outra foto."
                        : "A leitura não está disponível agora. Tente de novo.";
            } catch (IOException | JSONException | RuntimeException e) {
                erro = "Não foi possível ler a receita. Verifique a conexão e tente de novo.";
            }
            LojaApi.LeituraReceita lida = nova;
            String mensagem = erro;
            atualizarTela(() -> {
                lendoReceita = false;
                leitura = lida;
                erroReceita = mensagem;
                if (tela == Tela.RECEITA) mostrar();
            });
        });
    }

    /** Reduz a foto para JPEG até 3 MB (o limite do servidor). Devolve null se não der. */
    private byte[] prepararReceita(Uri uri) throws IOException {
        var opcoes = new android.graphics.BitmapFactory.Options();
        opcoes.inJustDecodeBounds = true;
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) return null;
            android.graphics.BitmapFactory.decodeStream(entrada, null, opcoes);
        }
        int lado = Math.max(opcoes.outWidth, opcoes.outHeight);
        if (lado <= 0) return null;
        opcoes.inJustDecodeBounds = false;
        opcoes.inSampleSize = 1;
        while (lado / opcoes.inSampleSize > 1600) opcoes.inSampleSize *= 2;
        android.graphics.Bitmap imagem;
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) return null;
            imagem = android.graphics.BitmapFactory.decodeStream(entrada, null, opcoes);
        }
        if (imagem == null) return null;
        try {
            for (int qualidade : new int[] {85, 70, 55}) {
                var saida = new java.io.ByteArrayOutputStream();
                imagem.compress(android.graphics.Bitmap.CompressFormat.JPEG, qualidade, saida);
                if (saida.size() <= TAMANHO_MAX_RECEITA) return saida.toByteArray();
            }
            return null;
        } finally {
            imagem.recycle();
        }
    }

    private void receita(LinearLayout pai) {
        titulo(pai, "Receita por foto");
        if (lendoReceita) {
            estado(pai, "Lendo a receita…");
            return;
        }
        if (erroReceita != null) {
            estado(pai, erroReceita);
            pai.addView(atalho("Escolher outra foto", this::escolherFotoReceita));
            return;
        }
        if (leitura == null) {
            estado(pai, "Escolha uma foto da receita para começar.");
            pai.addView(atalho("Escolher foto", this::escolherFotoReceita));
            return;
        }
        if (!leitura.ehReceita()) {
            estado(pai, "Esta foto não parece uma receita. Tente outra foto, com o papel inteiro e legível.");
            pai.addView(atalho("Escolher outra foto", this::escolherFotoReceita));
            return;
        }
        estado(pai, "A loja confirma a receita com o farmacêutico antes de qualquer venda. Itens com receita ou controlados seguem as regras da retirada.");
        for (LojaApi.ResultadoReceita r : leitura.resultados()) {
            String cabecalho = r.nome() + (r.dosagem() == null ? "" : " " + r.dosagem());
            pai.addView(texto(cabecalho, 17, ESCURO, true));
            String situacao = switch (r.status()) {
                case "achado" -> "Disponível na loja";
                case "dose" -> "Existe na loja, mas não nesta dosagem";
                default -> "Não encontrado no catálogo";
            };
            pai.addView(texto(situacao + (r.entendidoComo() == null ? "" : " · entendido como " + r.entendidoComo()), 14, NEUTRO, false));
            for (LojaApi.ItemReceita item : r.itens()) {
                LojaApi.Produto p = produto(item.id());
                if (p == null) continue;
                LinearLayout linha = coluna();
                linha.setBackground(fundo(Color.WHITE, 15));
                padding(linha, 12, 10, 12, 10);
                linha.addView(texto(item.nome(), 15, ESCURO, true));
                linha.addView(texto(moeda(item.precoCentavos()), 15, VERDE, true));
                int qtd = cesta.getOrDefault(p.id(), 0);
                boolean pode = qtd < p.limite() && (qtd > 0 || cesta.size() < catalogo.maxItens());
                acao(linha, qtd > 0 ? "Adicionar mais · " + qtd + " na cesta" : "Adicionar à cesta", true, pode, () -> {
                    mudarQuantidade(p.id(), qtd + 1);
                    aviso = "Produto adicionado à cesta.";
                    mostrar();
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
                lp.setMargins(0, 0, 0, dp(8));
                pai.addView(linha, lp);
            }
        }
    }

    private void abrirBusca(String termo) {
        busca = termo;
        departamento = null;
        vendoOfertas = false;
        listaRenderizada = null;
        primeiroProduto = deslocamentoProduto = 0;
        navegar(Tela.PRODUTOS);
    }

    private Button atalho(String rotulo, Runnable acao) {
        Button botao = botao(rotulo, false, acao);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 0, 0, dp(8));
        botao.setLayoutParams(lp);
        return botao;
    }

    private void abrirProdutos(String slug, boolean ofertas) {
        departamento = slug;
        vendoOfertas = ofertas;
        listaRenderizada = null;
        primeiroProduto = deslocamentoProduto = 0;
        navegar(Tela.PRODUTOS);
    }

    /** Departamentos na ordem do site (vêm da API); o item "Todos" limpa o filtro. */
    private void escolherDepartamento() {
        var nomes = new ArrayList<String>();
        var slugs = new ArrayList<String>();
        nomes.add("Todos os departamentos");
        slugs.add(null);
        for (LojaApi.Departamento d : catalogo.departamentos()) {
            nomes.add(d.nome());
            slugs.add(d.slug());
        }
        escolher("Departamentos", nomes, Math.max(0, slugs.indexOf(departamento)), indice -> {
            departamento = slugs.get(indice);
            listaRenderizada = null;
            primeiroProduto = deslocamentoProduto = 0;
            mostrar();
        });
    }

    private String nomeDepartamento(String slug) {
        for (LojaApi.Departamento d : catalogo.departamentos()) if (d.slug().equals(slug)) return d.nome();
        return slug;
    }

    private boolean emOferta(LojaApi.Produto p) {
        return sincronizado && !falhaOfertas && p.nivel() > 0
                && ofertas.containsKey(LojaApi.chaveDaOferta(p.nome(), p.foto(), p.preco()));
    }

    private void detalhes(LinearLayout pai) {
        acao(pai, "Voltar aos produtos", false, true, () -> navegar(Tela.PRODUTOS));
        LojaApi.Produto p = produto(produtoAberto);
        if (p == null) {
            if (!carregando) estado(pai, "Este produto está indisponível no catálogo.");
            return;
        }
        LinearLayout ficha = cartao(pai);
        ficha.addView(texto(p.categoria(), 14, VERDE, true));
        titulo(ficha, p.nome());
        ImageView destaque = new ImageView(this);
        destaque.setScaleType(ImageView.ScaleType.FIT_CENTER);
        if (p.foto() != null) {
            ficha.addView(destaque, new LinearLayout.LayoutParams(-1, dp(195)));
            carregarFoto(destaque, p.foto(), p.nome());
        } else {
            ficha.addView(texto("Foto indisponível", 14, NEUTRO, false));
        }
        if (!p.marca().isEmpty()) ficha.addView(texto(p.marca(), 16, NEUTRO, false));
        if (p.apresentacao() != null) ficha.addView(texto("Apresentação: " + p.apresentacao(), 16, ESCURO, false));
        ficha.addView(texto(p.preco() <= 0 ? "Preço indisponível" : moeda(p.preco()), 24, VERDE, true));
        int anterior = ofertas.getOrDefault(LojaApi.chaveDaOferta(p.nome(), p.foto(), p.preco()), 0);
        if (anterior > p.preco() && emOferta(p)) {
            ficha.addView(texto("Preço anterior: " + moeda(anterior), 14, NEUTRO, false));
        }
        ficha.addView(texto(disponibilidade(p), 15, p.nivel() == 0 ? ERRO : NEUTRO, false));
        if (p.aviso() != null) ficha.addView(texto(p.aviso(), 14, NEUTRO, false));
        if (p.receita() != null) ficha.addView(texto("A loja orienta como apresentar a receita.", 15, ESCURO, true));
        int qtd = cesta.getOrDefault(p.id(), 0);
        acao(ficha, qtd > 0 ? "Adicionar mais · " + qtd + " na cesta" : "Adicionar à cesta", true,
                qtd < p.limite() && (qtd > 0 || cesta.size() < catalogo.maxItens()), () -> {
                    mudarQuantidade(p.id(), qtd + 1);
                    aviso = "Produto adicionado à cesta.";
                    mostrar();
                });
        if (qtd > 0) acao(ficha, "Ver cesta", false, true, () -> navegar(Tela.CESTA));
        if (!p.id().equals(combinaDe) && !combinaCarregando) carregarCombinaCom(p.id());
        if (p.id().equals(combinaDe) && !combinaAtual.isEmpty()) {
            titulo(pai, "Combina com este produto");
            pai.addView(relacionadosLinha(combinaAtual));
        }
    }

    private void carregarCombinaCom(String id) {
        combinaCarregando = true;
        rede.execute(() -> {
            List<LojaApi.Relacionado> lista;
            try {
                lista = api.combinaCom(id);
            } catch (IOException | JSONException e) {
                lista = Collections.emptyList();
            }
            List<LojaApi.Relacionado> resultado = lista;
            atualizarTela(() -> {
                combinaDe = id;
                combinaAtual = resultado;
                combinaCarregando = false;
                if (tela == Tela.DETALHES && id.equals(produtoAberto)) mostrar();
            });
        });
    }

    /** Cartões do "Combina com": tocar abre a ficha do produto sugerido. */
    private View relacionadosLinha(List<LojaApi.Relacionado> itens) {
        HorizontalScrollView rolagem = new HorizontalScrollView(this);
        rolagem.setHorizontalScrollBarEnabled(false);
        LinearLayout linha = new LinearLayout(this);
        linha.setOrientation(LinearLayout.HORIZONTAL);
        for (LojaApi.Relacionado relacionado : itens) {
            LinearLayout cartao = coluna();
            cartao.setBackground(fundo(Color.WHITE, 15));
            padding(cartao, 8, 8, 8, 8);
            cartao.setClickable(true);
            cartao.setFocusable(true);
            ImageView foto = new ImageView(this);
            foto.setScaleType(ImageView.ScaleType.FIT_CENTER);
            cartao.addView(foto, new LinearLayout.LayoutParams(dp(120), dp(120)));
            carregarFoto(foto, relacionado.foto(), relacionado.nome());
            TextView nome = texto(relacionado.nome(), 13, ESCURO, false);
            nome.setMaxLines(2);
            cartao.addView(nome, new LinearLayout.LayoutParams(-1, -2));
            cartao.addView(texto(moeda(relacionado.precoCentavos()), 15, VERDE, true), new LinearLayout.LayoutParams(-1, -2));
            cartao.setOnClickListener(v -> {
                produtoAberto = relacionado.id();
                navegar(Tela.DETALHES);
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(136), -2);
            lp.setMargins(0, 0, dp(10), dp(4));
            linha.addView(cartao, lp);
        }
        rolagem.addView(linha);
        return rolagem;
    }

    private String disponibilidade(LojaApi.Produto p) {
        String fonte = p.atualizado() && sincronizado ? "Atualização da loja" : "Catálogo publicado";
        if (p.nivel() == 0) return "Sem estoque · " + fonte;
        if (!sincronizado) return "Disponibilidade a confirmar pela loja";
        if (p.nivel() < 6) return "Estoque baixo · " + fonte;
        return "Disponível para solicitar · " + fonte;
    }

    private void mudarQuantidade(String id, int qtd) {
        if (qtd > 0) cesta.put(id, qtd);
        else cesta.remove(id);
        local.guardarCesta(cesta);
    }

    private void cesta(LinearLayout pai) {
        titulo(pai, "Minha cesta");
        if (cesta.isEmpty()) {
            estado(pai, "Sua cesta está vazia.");
            acao(pai, "Ver produtos", true, true, () -> navegar(Tela.PRODUTOS));
            return;
        }
        long subtotal = 0;
        boolean itensValidos = true;
        boolean comReceita = false;
        for (var linha : cesta.entrySet()) {
            String id = linha.getKey();
            int qtd = linha.getValue();
            LojaApi.Produto p = produto(id);
            LinearLayout ficha = cartao(pai);
            String nome = p == null ? id : p.nome();
            ficha.addView(texto(nome, 17, ESCURO, true));
            if (p != null && p.preco() > 0) {
                subtotal += (long) p.preco() * qtd;
                ficha.addView(texto(moeda(p.preco()) + " por unidade", 15, NEUTRO, false));
            }
            if (p == null || p.limite() == 0) {
                ficha.addView(texto("Item indisponível para solicitar.", 15, ERRO, false));
                itensValidos = false;
            } else if (qtd > p.limite()) {
                ficha.addView(texto("Reduza a quantidade para até " + p.limite() + ".", 15, ERRO, false));
                itensValidos = false;
            }
            if (p != null && p.receita() != null) comReceita = true;
            LinearLayout botoes = new LinearLayout(this);
            botoes.setGravity(Gravity.CENTER_VERTICAL);
            ficha.addView(botoes);
            Button menos = botao("−", false, () -> {
                mudarQuantidade(id, qtd - 1);
                mostrar();
            });
            menos.setContentDescription(qtd == 1 ? "Remover " + nome : "Diminuir quantidade de " + nome);
            menos.setEnabled(!enviando);
            botoes.addView(menos, new LinearLayout.LayoutParams(dp(48), -2));
            TextView quantidade = texto(String.valueOf(qtd), 17, ESCURO, true);
            quantidade.setGravity(Gravity.CENTER);
            quantidade.setContentDescription("Quantidade " + qtd);
            botoes.addView(quantidade, new LinearLayout.LayoutParams(dp(48), -2));
            Button mais = botao("+", false, () -> {
                mudarQuantidade(id, qtd + 1);
                mostrar();
            });
            mais.setContentDescription("Aumentar quantidade de " + nome);
            mais.setEnabled(!enviando && p != null && qtd < p.limite());
            botoes.addView(mais, new LinearLayout.LayoutParams(dp(48), -2));
            acao(ficha, "Remover", false, !enviando, () -> {
                mudarQuantidade(id, 0);
                mostrar();
            }).setContentDescription("Remover " + nome);
        }

        LojaApi.Unidade unit = unidade();
        if (unit == null) return;
        LinearLayout pedido = cartao(pai);
        titulo(pedido, "Como receber");
        acao(pedido, "Unidade: " + unit.nome(), false, !enviando, this::escolherUnidade);
        pedido.addView(texto(unit.endereco(), 14, NEUTRO, false));
        boolean podeEntregar = !unit.bairros().isEmpty();
        if (!podeEntregar) entrega = false;
        acao(pedido, entrega ? "Forma: entrega" : "Forma: retirada na loja", false, !enviando && podeEntregar,
                () -> escolher("Como receber", java.util.Arrays.asList("Retirada na loja", "Entrega"), entrega ? 1 : 0, indice -> {
                    entrega = indice == 1;
                    mostrar();
                }));
        if (comReceita) {
            pedido.addView(texto(entrega ? "A loja confirma se pode entregar estes itens e como apresentar a receita."
                    : "Apresente a receita na retirada.", 15, NEUTRO, false));
        }
        LojaApi.Bairro area = bairroSelecionado();
        Integer taxa = 0;
        if (entrega) {
            acao(pedido, area == null ? "Escolher bairro de entrega" : "Bairro: " + area.nome(),
                    false, !enviando, this::escolherBairro);
            taxa = area == null ? null : area.taxa();
            pedido.addView(texto(taxa == null ? "Taxa de entrega a confirmar pela loja."
                    : "Taxa de entrega: " + moeda(taxa), 14, NEUTRO, false));
        }
        pedido.addView(texto("Subtotal dos produtos: " + moeda(subtotal), 16, ESCURO, true));
        if (entrega && taxa != null) pedido.addView(texto("Total estimado: " + moeda(subtotal + taxa), 16, ESCURO, true));
        espacador(pedido, 8);
        pedido.addView(texto("Ao continuar, a cesta será registrada como pré-venda e o WhatsApp abrirá para você revisar e enviar a mensagem. A loja confirma preço, estoque e atendimento na conversa.", 15, NEUTRO, false));
        boolean podeContinuar = itensValidos && sincronizado && !carregando && !enviando && (!entrega || area != null);
        acao(pedido, enviando ? "Registrando pré-venda…" : "Continuar no WhatsApp", true, podeContinuar, this::abrirWhatsApp);
    }

    private void escolherUnidade() {
        var nomes = new ArrayList<String>();
        for (var unit : catalogo.unidades()) nomes.add(unit.nome() + "\n" + unit.endereco());
        escolher("Unidade", nomes, catalogo.unidades().indexOf(unidade()), indice -> {
            LojaApi.Unidade anterior = unidade();
            unidadeId = catalogo.unidades().get(indice).id();
            if (!anterior.id().equals(unidadeId)) bairro = null;
            mostrar();
        });
    }

    private void escolherBairro() {
        var bairros = unidade().bairros();
        var nomes = new ArrayList<String>();
        for (var area : bairros) nomes.add(area.nome());
        escolher("Bairro de entrega", nomes, nomes.indexOf(bairro), indice -> {
            bairro = bairros.get(indice).nome();
            mostrar();
        });
    }

    private void abrirWhatsApp() {
        if (!conectado()) {
            aviso = "Sem conexão com a internet. Sua cesta continua neste aparelho.";
            mostrar();
            return;
        }
        var sonda = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/5500000000000"));
        if (sonda.resolveActivity(getPackageManager()) == null) {
            aviso = "Instale o WhatsApp ou habilite um navegador para continuar.";
            mostrar();
            return;
        }
        String modo = entrega ? "casa" : "retirar";
        var itens = new LinkedHashMap<>(cesta);
        JSONObject corpo = new JSONObject();
        try {
            JSONArray linhas = new JSONArray();
            for (var item : itens.entrySet()) {
                linhas.put(new JSONObject().put("id", item.getKey()).put("qtd", item.getValue())
                        .put("precoCentavos", produto(item.getKey()).preco()));
            }
            LojaApi.Bairro area = entrega ? bairroSelecionado() : null;
            Object taxa = area == null ? 0 : area.taxa() == null ? JSONObject.NULL : area.taxa();
            corpo.put("itens", linhas).put("unidade", unidade().id()).put("modo", modo).put("taxaCentavos", taxa);
            if (area != null) corpo.put("bairro", area.nome());
            corpo.put("requestId", local.tentativa(corpo));
        } catch (JSONException e) {
            aviso = "Não foi possível preparar a cesta. Tente novamente.";
            mostrar();
            return;
        }
        enviando = true;
        aviso = null;
        mostrar();
        rede.execute(() -> {
            try {
                LojaApi.PreVenda preVenda = api.registrar(corpo);
                atualizarTela(() -> {
                    enviando = false;
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, preVenda.whatsapp()));
                    } catch (ActivityNotFoundException | SecurityException e) {
                        aviso = "Pré-venda " + preVenda.codigo() + " registrada. Não foi possível abrir o WhatsApp neste aparelho.";
                        return;
                    }
                    local.guardarRecente(preVenda.codigo(), modo, itens);
                    local.finalizarTentativa();
                    cesta.clear();
                    local.guardarCesta(cesta);
                    entrega = false;
                    bairro = null;
                    tela = Tela.RECENTES;
                    aviso = "Pré-venda " + preVenda.codigo() + " registrada. Envie a mensagem no WhatsApp para falar com a loja.";
                });
            } catch (LojaApi.FalhaHttp e) {
                atualizarTela(() -> {
                    enviando = false;
                    aviso = e.status == 409
                            ? "A loja atualizou preço, estoque ou entrega. Revise a cesta e tente novamente."
                            : "Não foi possível validar ou registrar a pré-venda. Tente novamente.";
                    if (e.status == 409) carregar(false);
                });
            } catch (IOException | JSONException e) {
                atualizarTela(() -> {
                    enviando = false;
                    aviso = conectado() ? "Não foi possível confirmar o registro. Tente novamente."
                            : "A conexão caiu. Sua cesta continua neste aparelho.";
                });
            }
        });
    }

    private void recentes(LinearLayout pai) {
        titulo(pai, "Pedidos recentes");
        pai.addView(texto("Histórico deste aparelho. A pré-venda registra a tentativa de iniciar o contato. Envio da mensagem, estoque e venda dependem da conversa com a loja.", 15, NEUTRO, false));
        var recentes = local.recentes();
        if (recentes.isEmpty()) {
            estado(pai, "Nenhuma pré-venda recente.");
            return;
        }
        DateFormat datas = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT, BRASIL);
        for (var recente : recentes) {
            LinearLayout ficha = cartao(pai);
            ficha.addView(texto("Pré-venda #" + recente.codigo(), 18, ESCURO, true));
            ficha.addView(texto(datas.format(new Date(recente.momento())) + " · "
                    + ("casa".equals(recente.modo()) ? "Entrega" : "Retirada"), 14, NEUTRO, false));
            for (var item : recente.itens().entrySet()) {
                LojaApi.Produto p = produto(item.getKey());
                ficha.addView(texto(item.getValue() + " × " + (p == null ? item.getKey() : p.nome()), 15, ESCURO, false));
            }
            acao(ficha, "Repetir cesta", false, sincronizado && !carregando, () -> repetir(recente));
        }
        acao(pai, "Apagar histórico do aparelho", false, true, () -> new AlertDialog.Builder(this)
                .setTitle("Apagar pedidos recentes?")
                .setMessage("Você perderá a opção de repetir estas cestas pelo histórico deste aparelho.")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Apagar", (d, w) -> {
                    local.apagarRecentes();
                    mostrar();
                }).show());
    }

    private void repetir(CestasLocais.Recente recente) {
        int adicionados = 0;
        int pedidos = 0;
        for (var item : recente.itens().entrySet()) {
            pedidos += item.getValue();
            var p = produto(item.getKey());
            if (p == null || p.limite() == 0) continue;
            int atual = cesta.getOrDefault(p.id(), 0);
            if (atual == 0 && cesta.size() >= catalogo.maxItens()) continue;
            int cabe = Math.min(item.getValue(), p.limite() - atual);
            if (cabe > 0) {
                mudarQuantidade(p.id(), atual + cabe);
                adicionados += cabe;
            }
        }
        if (adicionados > 0) tela = Tela.CESTA;
        aviso = adicionados == 0 ? "Nenhum item pôde ser adicionado à cesta."
                : adicionados < pedidos ? "Parte dos itens foi adicionada. Confira as quantidades e os preços atuais."
                : "Itens adicionados. Confira as quantidades e os preços atuais.";
        mostrar();
    }

    /** Filtros com a lista do servidor (mesmas facetas e contagens do site). Só vale fora da aba Ofertas. */
    private boolean usaFiltroServidor() {
        // Com busca, departamento, filtro ou preço, a lista vem do mecanismo de busca do site (mesmos resultados e ordem).
        return !vendoOfertas && (!filtrosSel.isEmpty() || precoMaxFiltro > 0 || !busca.trim().isEmpty() || departamento != null);
    }

    private String chaveAtual() {
        return busca + "|" + departamento + "|" + new java.util.TreeMap<>(filtrosSel) + "|" + precoMaxFiltro;
    }

    private int contarSelecoes() {
        int total = 0;
        for (java.util.Set<String> valores : filtrosSel.values()) total += valores.size();
        return total;
    }

    /** Busca na lista do servidor e guarda os ids e as facetas; a tela é redesenhada logo depois. */
    private void atualizarFiltroServidor(Runnable depois) {
        String chave = chaveAtual();
        String consulta = busca;
        String dep = departamento;
        var sel = new LinkedHashMap<String, java.util.Set<String>>(filtrosSel);
        Double precoMax = precoMaxFiltro > 0 ? precoMaxFiltro / 100.0 : null;
        rede.execute(() -> {
            LojaApi.ListaFiltrada lida;
            try {
                lida = api.lista(consulta, dep, sel, precoMax);
            } catch (IOException | JSONException | RuntimeException e) {
                lida = null;
            }
            LojaApi.ListaFiltrada resultado = lida;
            atualizarTela(() -> {
                chaveFiltro = chave;
                if (resultado == null) {
                    idsFiltrados = Collections.emptyList();
                    aviso = "Não foi possível filtrar agora. Tente de novo.";
                } else {
                    idsFiltrados = resultado.ids();
                    facetasAtuais = resultado.facetas();
                }
                if (depois != null) depois.run();
            });
        });
    }

    private void abrirFiltros() {
        atualizarFiltroServidor(this::mostrarListaFiltros);
    }

    private void mostrarListaFiltros() {
        if (facetasAtuais.isEmpty()) {
            aviso = "Não há filtros para esta busca.";
            return;
        }
        var titulos = new ArrayList<String>();
        for (LojaApi.FacetaFiltro f : facetasAtuais) {
            int n = filtrosSel.getOrDefault(f.id(), Collections.emptySet()).size();
            titulos.add(f.titulo() + (n > 0 ? " · " + n : ""));
        }
        boolean temSelecao = contarSelecoes() > 0;
        if (temSelecao) titulos.add("Limpar filtros");
        new AlertDialog.Builder(this).setTitle("Filtros")
                .setItems(titulos.toArray(new String[0]), (dialogo, indice) -> {
                    if (indice == facetasAtuais.size()) {
                        filtrosSel.clear();
                        mostrar();
                    } else {
                        abrirOpcoesFaceta(facetasAtuais.get(indice));
                    }
                })
                .setNegativeButton("Fechar", null).show();
    }

    private void abrirOpcoesFaceta(LojaApi.FacetaFiltro faceta) {
        int total = faceta.opcoes().size();
        var rotulos = new String[total];
        var marcados = new boolean[total];
        java.util.Set<String> atuais = filtrosSel.getOrDefault(faceta.id(), Collections.emptySet());
        for (int i = 0; i < total; i++) {
            LojaApi.OpcaoFiltro opcao = faceta.opcoes().get(i);
            rotulos[i] = opcao.label() + " (" + opcao.contagem() + ")";
            marcados[i] = atuais.contains(opcao.valor());
        }
        new AlertDialog.Builder(this).setTitle(faceta.titulo())
                .setMultiChoiceItems(rotulos, marcados, (dialogo, indice, marcado) -> marcados[indice] = marcado)
                .setPositiveButton("Aplicar", (dialogo, botao) -> {
                    var novos = new java.util.LinkedHashSet<String>();
                    for (int i = 0; i < total; i++) if (marcados[i]) novos.add(faceta.opcoes().get(i).valor());
                    if (novos.isEmpty()) filtrosSel.remove(faceta.id());
                    else filtrosSel.put(faceta.id(), novos);
                    mostrar();
                })
                .setNegativeButton("Cancelar", null).show();
    }

    private void escolherPreco() {
        final int[] limites = {0, 1000, 3000, 6000};
        var nomes = new ArrayList<String>();
        nomes.add("Sem limite");
        for (int limite : new int[] {1000, 3000, 6000}) nomes.add("Até " + moeda(limite));
        int selecionado = 0;
        for (int i = 0; i < limites.length; i++) if (limites[i] == precoMaxFiltro) selecionado = i;
        escolher("Preço", nomes, selecionado, indice -> {
            precoMaxFiltro = limites[indice];
            listaRenderizada = null;
            primeiroProduto = deslocamentoProduto = 0;
            mostrar();
        });
    }

    private void escolher(String titulo, List<String> opcoes, int selecionado, java.util.function.IntConsumer acao) {
        new AlertDialog.Builder(this).setTitle(titulo)
                .setSingleChoiceItems(opcoes.toArray(new String[0]), selecionado, (dialogo, posicao) -> {
                    dialogo.dismiss();
                    acao.accept(posicao);
                }).setNegativeButton("Cancelar", null).show();
    }

    private String moeda(long centavos) {
        return reais.format(java.math.BigDecimal.valueOf(centavos, 2));
    }

    private int dp(int valor) {
        return Math.round(valor * getResources().getDisplayMetrics().density);
    }

    private void padding(View v, int esquerda, int topo, int direita, int base) {
        v.setPadding(dp(esquerda), dp(topo), dp(direita), dp(base));
    }

    private LinearLayout coluna() {
        var coluna = new LinearLayout(this);
        coluna.setOrientation(LinearLayout.VERTICAL);
        return coluna;
    }

    private GradientDrawable fundo(int cor, int raio) {
        var forma = new GradientDrawable();
        forma.setColor(cor);
        forma.setCornerRadius(dp(raio));
        return forma;
    }

    private TextView texto(String valor, int tamanho, int cor, boolean forte) {
        var texto = new TextView(this);
        texto.setText(valor);
        texto.setTextSize(tamanho);
        texto.setTextColor(cor);
        if (forte) texto.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return texto;
    }

    private void titulo(LinearLayout pai, String valor) {
        TextView titulo = texto(valor, 24, ESCURO, true);
        if (android.os.Build.VERSION.SDK_INT >= 28) titulo.setAccessibilityHeading(true);
        padding(titulo, 0, 0, 0, 8);
        pai.addView(titulo);
    }

    private void estado(LinearLayout pai, String valor) {
        TextView estado = texto(valor, 15, ESCURO, false);
        estado.setBackground(fundo(MENTA, 10));
        estado.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        padding(estado, 12, 9, 12, 9);
        var lp = new LinearLayout.LayoutParams(-1, -2);
        lp.bottomMargin = dp(8);
        pai.addView(estado, lp);
    }

    private LinearLayout cartao(LinearLayout pai) {
        LinearLayout cartao = coluna();
        cartao.setBackground(fundo(Color.WHITE, 16));
        padding(cartao, 16, 15, 16, 14);
        var lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, dp(8), 0, dp(4));
        pai.addView(cartao, lp);
        return cartao;
    }

    private Button botao(String valor, boolean principal, Runnable acao) {
        var botao = new Button(this);
        botao.setAllCaps(false);
        botao.setText(valor);
        botao.setTextSize(14);
        botao.setMinHeight(dp(48));
        botao.setMinWidth(dp(48));
        padding(botao, 6, 7, 6, 7);
        botao.setTextColor(new ColorStateList(new int[][]{new int[]{-android.R.attr.state_enabled}, new int[]{}},
                new int[]{NEUTRO, principal ? Color.WHITE : VERDE}));
        var cores = new android.graphics.drawable.StateListDrawable();
        cores.addState(new int[]{-android.R.attr.state_enabled}, fundo(0xffe9efeb, 11));
        cores.addState(new int[]{}, fundo(principal ? VERDE : MENTA, 11));
        botao.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(0x33456359), cores, null));
        botao.setOnClickListener(v -> acao.run());
        return botao;
    }

    private Button acao(LinearLayout pai, String valor, boolean principal, boolean ativa, Runnable acao) {
        Button botao = botao(valor, principal, acao);
        botao.setEnabled(ativa);
        var lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(6);
        lp.bottomMargin = dp(4);
        pai.addView(botao, lp);
        return botao;
    }

    private void espacador(LinearLayout pai, int altura) {
        pai.addView(new View(this), new LinearLayout.LayoutParams(-1, dp(altura)));
    }

    private final class ProdutoAdapter extends BaseAdapter {
        private List<LojaApi.Produto> itens = Collections.emptyList();

        @Override public int getCount() { return itens.size(); }
        @Override public LojaApi.Produto getItem(int indice) { return itens.get(indice); }
        @Override public long getItemId(int indice) { return indice; }

        @Override public View getView(int posicao, View reciclada, ViewGroup pai) {
            LinhaProduto linha = reciclada == null ? new LinhaProduto() : (LinhaProduto) reciclada;
            LojaApi.Produto produto = getItem(posicao);
            linha.nome.setText(produto.nome());
            linha.apresentacao.setText(produto.apresentacao() == null ? "" : produto.apresentacao());
            linha.apresentacao.setVisibility(produto.apresentacao() == null ? View.GONE : View.VISIBLE);
            linha.preco.setText(produto.preco() <= 0 ? "Preço indisponível" : moeda(produto.preco()));
            linha.status.setText(disponibilidade(produto));
            linha.imagem.setVisibility(produto.foto() == null ? View.GONE : View.VISIBLE);
            carregarFoto(linha.imagem, produto.foto(), null);
            return linha;
        }
    }

    private final class LinhaProduto extends LinearLayout {
        final TextView nome = texto("", 16, ESCURO, true);
        final TextView apresentacao = texto("", 14, NEUTRO, false);
        final TextView preco = texto("", 17, VERDE, true);
        final TextView status = texto("", 13, NEUTRO, false);
        final ImageView imagem = new ImageView(MainActivity.this);

        LinhaProduto() {
            super(MainActivity.this);
            padding(this, 0, 4, 0, 4);
            // Cartão na vertical, como no site: foto em cima e os textos embaixo.
            LinearLayout cartao = coluna();
            padding(cartao, 12, 12, 12, 12);
            cartao.setBackground(fundo(Color.WHITE, 15));
            imagem.setScaleType(ImageView.ScaleType.FIT_CENTER);
            imagem.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            var espaco = new LinearLayout.LayoutParams(-1, dp(120));
            espaco.setMarginEnd(0);
            espaco.bottomMargin = dp(8);
            cartao.addView(imagem, espaco);
            // Altura fixa e textos com limite de linhas: os cards de uma mesma linha da grade ficam do mesmo tamanho.
            nome.setMaxLines(2);
            nome.setEllipsize(android.text.TextUtils.TruncateAt.END);
            apresentacao.setMaxLines(1);
            apresentacao.setEllipsize(android.text.TextUtils.TruncateAt.END);
            status.setMaxLines(2);
            status.setEllipsize(android.text.TextUtils.TruncateAt.END);
            cartao.addView(nome);
            cartao.addView(apresentacao);
            cartao.addView(preco);
            cartao.addView(status);
            addView(cartao, new LinearLayout.LayoutParams(-1, dp(300)));
        }
    }

    private void carregarFoto(ImageView imagem, String arquivo, String acessivel) {
        imagem.setTag(arquivo);
        imagem.setImageDrawable(null);
        imagem.setBackground(fundo(FUNDO, 9));
        imagem.setContentDescription(acessivel == null ? null : "Foto indisponível");
        if (arquivo == null) return;
        var foto = fotos.get(arquivo);
        if (foto != null) {
            imagem.setImageBitmap(foto);
            imagem.setContentDescription(acessivel == null ? null : "Foto de " + acessivel);
            return;
        }
        imagens.execute(() -> {
            try {
                var nova = api.foto(arquivo);
                if (nova == null) return;
                fotos.put(arquivo, nova);
                runOnUiThread(() -> {
                    if (isDestroyed() || !arquivo.equals(imagem.getTag())) return;
                    imagem.setImageBitmap(nova);
                    imagem.setContentDescription(acessivel == null ? null : "Foto de " + acessivel);
                });
            } catch (IOException e) {
                // A foto pode ficar indisponível sem impedir o uso do catálogo.
            }
        });
    }
}
