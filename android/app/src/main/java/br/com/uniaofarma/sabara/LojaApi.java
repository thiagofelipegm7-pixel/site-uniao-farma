package br.com.uniaofarma.sabara;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Collator;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

final class LojaApi {
    static final Locale BRASIL = Locale.forLanguageTag("pt-BR");
    private static final int MAX_JSON = 5 * 1024 * 1024;
    private static final Pattern ACENTOS = Pattern.compile("\\p{M}+");
    private static final Pattern NUMEROS = Pattern.compile("(?<=\\d)(?=[a-z])|(?<=[a-z])(?=\\d)");
    private static final Pattern SEPARADORES = Pattern.compile("[^a-z0-9]+");

    record Produto(String id, String nome, String marca, String categoria, String apresentacao,
                   String foto, String busca, int preco, int nivel, boolean atualizado,
                   int limite, String receita, String aviso, String departamento) {
        Produto(JSONObject item) throws JSONException {
            this(item.getString("id"), item.getString("nome"), item.optString("marca", ""),
                 item.getString("categoria"), texto(item, "apresentacao"), texto(item, "foto"),
                 textoBusca(item.getString("busca")), item.optInt("precoCentavos", 0), item.getInt("nivel"),
                 "atualizado".equals(item.getString("fonteEstoque")), item.getInt("limite"),
                 texto(item, "receita"), texto(item, "aviso"), texto(item, "departamento"));
        }
    }

    record Departamento(String slug, String nome) {}
    record Banner(String id, String url) {}
    record Destaque(String nome, int precoCentavos, String foto) {}
    record Relacionado(String id, String nome, int precoCentavos, String foto) {}
    record Bairro(String nome, Integer taxa) {}
    record Unidade(String id, String nome, String endereco, List<Bairro> bairros) {}
    record Catalogo(List<Unidade> unidades, List<Departamento> departamentos, List<Banner> banners, Map<String, Produto> produtos, int maxItens) {
        static Catalogo ler(JSONObject raiz) throws JSONException {
            var unidades = new ArrayList<Unidade>();
            JSONArray lojas = raiz.getJSONArray("unidades");
            for (int i = 0; i < lojas.length(); i++) {
                JSONObject loja = lojas.getJSONObject(i);
                JSONArray areas = loja.getJSONArray("bairros");
                var bairros = new ArrayList<Bairro>();
                for (int j = 0; j < areas.length(); j++) {
                    JSONObject area = areas.getJSONObject(j);
                    bairros.add(new Bairro(area.getString("nome"),
                            area.isNull("taxaCentavos") ? null : area.getInt("taxaCentavos")));
                }
                unidades.add(new Unidade(loja.getString("id"), loja.getString("nome"),
                        loja.getString("endereco"), bairros));
            }
            var departamentos = new ArrayList<Departamento>();
            JSONArray deps = raiz.optJSONArray("departamentos");
            if (deps != null) {
                for (int i = 0; i < deps.length(); i++) {
                    JSONObject dep = deps.getJSONObject(i);
                    departamentos.add(new Departamento(dep.getString("slug"), dep.getString("nome")));
                }
            }
            var banners = new ArrayList<Banner>();
            JSONArray arts = raiz.optJSONArray("banners");
            if (arts != null) {
                for (int i = 0; i < arts.length(); i++) {
                    JSONObject arte = arts.getJSONObject(i);
                    banners.add(new Banner(arte.getString("id"), arte.getString("url")));
                }
            }
            var lista = new ArrayList<Produto>();
            JSONArray itens = raiz.getJSONArray("itens");
            for (int i = 0; i < itens.length(); i++) lista.add(new Produto(itens.getJSONObject(i)));
            Collator ordem = Collator.getInstance(BRASIL);
            lista.sort(Comparator.comparing(Produto::nome, ordem));
            var produtos = new LinkedHashMap<String, Produto>();
            for (Produto item : lista) produtos.put(item.id(), item);
            return new Catalogo(unidades, departamentos, banners, produtos, raiz.getInt("maxItens"));
        }
    }

    record PreVenda(String codigo, Uri whatsapp) {}

    static final class FalhaHttp extends IOException {
        final int status;

        FalhaHttp(int status) {
            super("HTTP " + status);
            this.status = status;
        }
    }

    private static String texto(JSONObject item, String chave) {
        return item.isNull(chave) ? null : item.optString(chave, null);
    }

    static String textoBusca(String texto) {
        String decomposto = Normalizer.normalize(texto, Normalizer.Form.NFD);
        String simples = ACENTOS.matcher(decomposto).replaceAll("").toLowerCase(BRASIL);
        return SEPARADORES.matcher(NUMEROS.matcher(simples).replaceAll(" ")).replaceAll(" ").trim();
    }

    JSONObject catalogo() throws IOException, JSONException {
        return json("/api/android/catalogo", null);
    }

    /** Vitrine da home, com a mesma escolha de itens do site (/api/destaques). A consulta vem de constantes do app. */
    List<Destaque> destaques(String consulta) throws IOException, JSONException {
        JSONArray itens = json("/api/destaques?fotos=1&n=8&" + consulta, null).getJSONArray("itens");
        var lista = new ArrayList<Destaque>();
        for (int i = 0; i < itens.length(); i++) {
            JSONObject item = itens.getJSONObject(i);
            lista.add(new Destaque(item.getString("nome"), item.getInt("precoCentavos"), item.getString("foto")));
        }
        return lista;
    }

    /** "Combina com" de um produto (/api/android/combina). O id é o nome bruto do produto. */
    List<Relacionado> combinaCom(String id) throws IOException, JSONException {
        String consulta = "/api/android/combina?id=" + java.net.URLEncoder.encode(id, "UTF-8");
        JSONArray itens = json(consulta, null).getJSONArray("itens");
        var lista = new ArrayList<Relacionado>();
        for (int i = 0; i < itens.length(); i++) {
            JSONObject item = itens.getJSONObject(i);
            lista.add(new Relacionado(item.getString("id"), item.getString("nome"),
                    item.getInt("precoCentavos"), item.getString("foto")));
        }
        return lista;
    }

    /** Medicamento lido da receita e o que a loja tem para ele (/api/android/receita). Nada disso é guardado. */
    record ItemReceita(String id, String nome, int precoCentavos) {}
    record ResultadoReceita(String nome, String dosagem, String status, String entendidoComo, List<ItemReceita> itens) {}
    record LeituraReceita(boolean ehReceita, List<ResultadoReceita> resultados) {}

    LeituraReceita lerReceita(byte[] imagem, String tipo) throws IOException, JSONException {
        JSONObject resposta = postBytes("/api/android/receita", imagem, tipo);
        var lista = new ArrayList<ResultadoReceita>();
        JSONArray resultados = resposta.optJSONArray("resultados");
        if (resultados != null) {
            for (int i = 0; i < resultados.length(); i++) {
                JSONObject r = resultados.getJSONObject(i);
                JSONObject lido = r.getJSONObject("lido");
                var itens = new ArrayList<ItemReceita>();
                JSONArray arr = r.getJSONArray("itens");
                for (int j = 0; j < arr.length(); j++) {
                    JSONObject it = arr.getJSONObject(j);
                    itens.add(new ItemReceita(it.getString("id"), it.getString("nome"), it.getInt("precoCentavos")));
                }
                lista.add(new ResultadoReceita(lido.getString("nome"), texto(lido, "dosagem"),
                        r.getString("status"), texto(r, "entendidoComo"), itens));
            }
        }
        return new LeituraReceita(resposta.optBoolean("ehReceita", false), lista);
    }

    private JSONObject postBytes(String caminho, byte[] corpo, String tipo) throws IOException, JSONException {
        HttpURLConnection conexao = abrir(caminho);
        try {
            // A leitura pela IA pode levar até ~35 s no servidor; a espera do app cobre isso.
            conexao.setReadTimeout(45000);
            conexao.setRequestMethod("POST");
            conexao.setDoOutput(true);
            conexao.setRequestProperty("Accept", "application/json");
            conexao.setRequestProperty("Content-Type", tipo);
            conexao.setFixedLengthStreamingMode(corpo.length);
            try (var saida = conexao.getOutputStream()) {
                saida.write(corpo);
            }
            int status = conexao.getResponseCode();
            if (status < 200 || status >= 300) throw new FalhaHttp(status);
            try (InputStream entrada = conexao.getInputStream()) {
                return new JSONObject(new String(ler(entrada, MAX_JSON), StandardCharsets.UTF_8));
            }
        } finally {
            conexao.disconnect();
        }
    }

    Map<String, Integer> ofertas() throws IOException, JSONException {
        JSONArray itens = json("/api/ofertas", null).getJSONArray("itens");
        var ofertas = new LinkedHashMap<String, Integer>();
        for (int i = 0; i < itens.length(); i++) {
            JSONObject item = itens.getJSONObject(i);
            String chave = chaveDaOferta(item.getString("nome"), item.getString("foto"),
                    item.getInt("precoCentavos"));
            ofertas.put(chave, item.optInt("precoAnteriorCentavos", 0));
        }
        return ofertas;
    }

    static String chaveDaOferta(String nome, String foto, int preco) {
        return nome + "\n" + foto + "\n" + preco;
    }

    PreVenda registrar(JSONObject pedido) throws IOException, JSONException {
        JSONObject resposta = json("/api/android/pre-vendas", pedido);
        Uri destino = Uri.parse(resposta.getString("whatsapp"));
        if (!"https".equals(destino.getScheme()) || !"wa.me".equals(destino.getEncodedAuthority())
                || destino.getPath() == null || !destino.getPath().matches("/[0-9]{8,15}")) {
            throw new IOException("Destino inválido");
        }
        return new PreVenda(resposta.getString("codigo"), destino);
    }

    Bitmap foto(String caminho) throws IOException {
        // Só fotos da própria loja: produto (EAN) ou banner da home. Qualquer outro caminho é recusado.
        if (!caminho.matches("/produtos/[0-9]+\\.webp|/banners-[0-9a-z]+/[A-Za-z0-9._-]+\\.(jpg|jpeg|webp|png)")) return null;
        HttpURLConnection conexao = abrir(caminho);
        try {
            if (conexao.getResponseCode() != 200) return null;
            try (InputStream entrada = conexao.getInputStream()) {
                byte[] bytes = ler(entrada, 2 * 1024 * 1024);
                BitmapFactory.Options opcoes = new BitmapFactory.Options();
                opcoes.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opcoes);
                opcoes.inSampleSize = 1;
                while (Math.max(opcoes.outWidth, opcoes.outHeight) / opcoes.inSampleSize > 1000) {
                    opcoes.inSampleSize *= 2;
                }
                opcoes.inJustDecodeBounds = false;
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opcoes);
            }
        } finally {
            conexao.disconnect();
        }
    }

    private JSONObject json(String caminho, JSONObject corpo) throws IOException, JSONException {
        HttpURLConnection conexao = abrir(caminho);
        try {
            conexao.setRequestProperty("Accept", "application/json");
            if (corpo != null) {
                byte[] bytes = corpo.toString().getBytes(StandardCharsets.UTF_8);
                conexao.setRequestMethod("POST");
                conexao.setDoOutput(true);
                conexao.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conexao.setFixedLengthStreamingMode(bytes.length);
                try (var saida = conexao.getOutputStream()) {
                    saida.write(bytes);
                }
            }
            int status = conexao.getResponseCode();
            if (status < 200 || status >= 300) throw new FalhaHttp(status);
            try (InputStream entrada = conexao.getInputStream()) {
                return new JSONObject(new String(ler(entrada, MAX_JSON), StandardCharsets.UTF_8));
            }
        } finally {
            conexao.disconnect();
        }
    }

    private HttpURLConnection abrir(String caminho) throws IOException {
        var conexao = (HttpURLConnection) new URL(BuildConfig.API_BASE_URL + caminho).openConnection();
        conexao.setInstanceFollowRedirects(false);
        conexao.setUseCaches(false);
        conexao.setConnectTimeout(6000);
        conexao.setReadTimeout(20000);
        return conexao;
    }

    private static byte[] ler(InputStream entrada, int maximo) throws IOException {
        var saida = new ByteArrayOutputStream();
        byte[] bloco = new byte[8192];
        for (int n; (n = entrada.read(bloco)) != -1;) {
            if (saida.size() + n > maximo) throw new IOException("Resposta muito grande");
            saida.write(bloco, 0, n);
        }
        return saida.toByteArray();
    }
}
