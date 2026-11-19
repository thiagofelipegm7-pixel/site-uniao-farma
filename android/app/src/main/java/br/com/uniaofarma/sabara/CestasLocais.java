package br.com.uniaofarma.sabara;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class CestasLocais {
    record Recente(String codigo, String modo, long momento, Map<String, Integer> itens) {}

    private static final int MAX_RECENTES = 8;
    private static final long RETENCAO_MS = 30L * 24 * 60 * 60 * 1000;
    private final SharedPreferences dados;
    private final AtomicFile cacheCatalogo;

    CestasLocais(Context context) {
        dados = context.getSharedPreferences("cestas-locais", Context.MODE_PRIVATE);
        cacheCatalogo = new AtomicFile(new File(context.getCacheDir(), "catalogo.json"));
    }

    JSONObject lerCatalogo() throws IOException, JSONException {
        return new JSONObject(new String(cacheCatalogo.readFully(), StandardCharsets.UTF_8));
    }

    void guardarCatalogo(JSONObject catalogo) throws IOException {
        var arquivo = cacheCatalogo.startWrite();
        try {
            arquivo.write(catalogo.toString().getBytes(StandardCharsets.UTF_8));
            cacheCatalogo.finishWrite(arquivo);
        } catch (IOException e) {
            cacheCatalogo.failWrite(arquivo);
            throw e;
        }
    }

    LinkedHashMap<String, Integer> cesta() {
        try {
            return lerItens(new JSONArray(dados.getString("cesta", "[]")));
        } catch (JSONException e) {
            return new LinkedHashMap<>();
        }
    }

    void guardarCesta(Map<String, Integer> cesta) {
        dados.edit().putString("cesta", itensJson(cesta).toString()).apply();
    }

    List<Recente> recentes() {
        var resultado = new ArrayList<Recente>();
        long limite = System.currentTimeMillis() - RETENCAO_MS;
        try {
            JSONArray lista = new JSONArray(dados.getString("recentes", "[]"));
            for (int i = 0; i < lista.length(); i++) {
                JSONObject item = lista.getJSONObject(i);
                long momento = item.getLong("momento");
                if (momento < limite) continue;
                resultado.add(new Recente(item.getString("codigo"), item.getString("modo"),
                        momento, lerItens(item.getJSONArray("itens"))));
            }
            if (lista.length() != resultado.size()) guardarRecentes(resultado);
        } catch (JSONException e) {
            apagarRecentes();
        }
        return resultado;
    }

    void guardarRecente(String codigo, String modo, Map<String, Integer> cesta) {
        var lista = recentes();
        lista.add(0, new Recente(codigo, modo, System.currentTimeMillis(), new LinkedHashMap<>(cesta)));
        guardarRecentes(lista.subList(0, Math.min(lista.size(), MAX_RECENTES)));
    }

    void apagarRecentes() {
        dados.edit().remove("recentes").apply();
    }

    String tentativa(JSONObject pedido) {
        // A assinatura permite retomar a mesma tentativa sem guardar o bairro.
        String assinatura;
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(pedido.toString().getBytes(StandardCharsets.UTF_8));
            assinatura = android.util.Base64.encodeToString(hash, android.util.Base64.NO_WRAP);
        } catch (NoSuchAlgorithmException e) {
            throw new AssertionError(e);
        }
        if (assinatura.equals(dados.getString("assinatura", ""))) {
            String anterior = dados.getString("tentativa", "");
            if (!anterior.isEmpty()) return anterior;
        }
        String id = UUID.randomUUID().toString();
        dados.edit().putString("assinatura", assinatura).putString("tentativa", id).apply();
        return id;
    }

    void finalizarTentativa() {
        dados.edit().remove("assinatura").remove("tentativa").apply();
    }

    private void guardarRecentes(List<Recente> recentes) {
        var lista = new JSONArray();
        try {
            for (Recente recente : recentes) {
                lista.put(new JSONObject().put("codigo", recente.codigo()).put("modo", recente.modo())
                        .put("momento", recente.momento()).put("itens", itensJson(recente.itens())));
            }
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
        dados.edit().putString("recentes", lista.toString()).apply();
    }

    private static LinkedHashMap<String, Integer> lerItens(JSONArray lista) throws JSONException {
        var itens = new LinkedHashMap<String, Integer>();
        for (int i = 0; i < lista.length(); i++) {
            JSONArray linha = lista.getJSONArray(i);
            int qtd = linha.getInt(1);
            if (qtd > 0) itens.put(linha.getString(0), qtd);
        }
        return itens;
    }

    private static JSONArray itensJson(Map<String, Integer> itens) {
        JSONArray lista = new JSONArray();
        for (var item : itens.entrySet()) {
            lista.put(new JSONArray().put(item.getKey()).put(item.getValue()));
        }
        return lista;
    }
}
