import {
  createConnection,
  InitializeResult,
  TextDocumentSyncKind,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

// Crea una conexión al cliente del lenguaje. La conexión
// usa stdin/stdout para comunicarse.
const connection = createConnection(process.stdin, process.stdout);

type NewType = TextDocuments<TextDocument>;

// Crea un gestor de documentos. Esto proporciona características como
// "onDidOpen", "onDidChange", "onDidClose" para documentos de texto.
const documents: NewType = new TextDocuments(TextDocument);

// --- Define all Completion Items in a structured way ---

// Helper function to create a snippet completion item
function createSnippet(
  label: string,
  kind: CompletionItemKind,
  insertText: string,
  documentation: string,
  detail: string
): CompletionItem {
  return {
    label,
    kind,
    insertText,
    insertTextFormat: InsertTextFormat.Snippet,
    documentation,
    detail,
  };
}

// Full component snippets
const componentSnippets: CompletionItem[] = [
  createSnippet(
    "prometheus.scrape",
    CompletionItemKind.Snippet,
    `prometheus.scrape "\${1:my_scraper}" {
  targets = [
    {
      __address__ = "\${2:localhost:9090}"
    }
  ]
  forward_to = [\${3:/* other.component.label.receiver */}]
}`,
    "Componente para recopilar métricas de Prometheus.",
    "prometheus.scrape \"label\" { ... }"
  ),
  createSnippet(
    "prometheus.remote_write",
    CompletionItemKind.Snippet,
    `prometheus.remote_write "\${1:my_remote_write}" {
  endpoint {
    url = "\${2:http://localhost:9090/api/v1/write}"
  }
}`,
    "Componente para enviar métricas a un endpoint de Prometheus remote_write.",
    "prometheus.remote_write \"label\" { ... }"
  ),
  createSnippet(
    "loki.write",
    CompletionItemKind.Snippet,
    `loki.write "\${1:my_loki_writer}" {
  endpoint {
    url = "\${2:http://localhost:3100/loki/api/v1/push}"
  }
  connection_timeout = "\${3:1m}"
}`,
    "Componente para enviar logs a Loki.",
    "loki.write \"label\" { ... }"
  ),
  createSnippet(
    "loki.source.file",
    CompletionItemKind.Snippet,
    `loki.source.file "\${1:my_file_source}" {
  targets = [
    {
      __path__ = "\${2:/var/log/*.log}"
      job = "\${3:mylogs}"
    }
  ]
  forward_to = [\${4:/* other.component.label.receiver */}]
}`,
    "Componente para leer logs de archivos locales y enviarlos a Loki.",
    "loki.source.file \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.receiver.otlp",
    CompletionItemKind.Snippet,
    `otelcol.receiver.otlp "\${1:my_otlp_receiver}" {
  http {
    endpoint = "\${2:0.0.0.0:4318}"
  }
  grpc {
    endpoint = "\${3:0.0.0.0:4317}"
  }
  output {
    metrics_receiver = [\${4:/* otelcol.processor.batch.metrics.receiver */}]
    logs_receiver = [\${5:/* otelcol.processor.batch.logs.receiver */}]
    traces_receiver = [\${6:/* otelcol.processor.batch.traces.receiver */}]
  }
}`,
    "Componente para recibir telemetry data (metrics, logs, traces) a través de OTLP.",
    "otelcol.receiver.otlp \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.processor.batch",
    CompletionItemKind.Snippet,
    `otelcol.processor.batch "\${1:my_batch_processor}" {
  output {
    metrics_receiver = [\${2:/* otelcol.exporter.otlp.metrics.receiver */}]
    logs_receiver = [\${3:/* otelcol.exporter.otlp.logs.receiver */}]
    traces_receiver = [\${4:/* otelcol.exporter.otlp.traces.receiver */}]
  }
}`,
    "Componente para agrupar (batch) telemetry data antes de enviarla.",
    "otelcol.processor.batch \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.exporter.otlp",
    CompletionItemKind.Snippet,
    `otelcol.exporter.otlp "\${1:my_otlp_exporter}" {
  client {
    endpoint = "\${2:localhost:4317}"
  }
}`,
    "Componente para exportar telemetry data a un endpoint OTLP.",
    "otelcol.exporter.otlp \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.exporter.prometheus",
    CompletionItemKind.Snippet,
    `otelcol.exporter.prometheus "\${1:my_prom_exporter}" {
  output {
    metrics_receiver = [\${2:/* prometheus.remote_write.my_remote_write.receiver */}]
  }
}`,
    "Componente para exportar métricas en formato Prometheus.",
    "otelcol.exporter.prometheus \"label\" { ... }"
  ),
  createSnippet(
    "discovery.kubernetes",
    CompletionItemKind.Snippet,
    `discovery.kubernetes "\${1:my_k8s_discovery}" {
  selectors {
    role = "\${2|node,pod,endpoint,service,ingress,container|}"
  }
  forward_to = [\${3:/* prometheus.scrape.my_scraper.targets */}]
}`,
    "Componente para descubrir objetivos en un clúster de Kubernetes.",
    "discovery.kubernetes \"label\" { ... }"
  ),
  createSnippet(
    "local.file_match",
    CompletionItemKind.Snippet,
    `local.file_match "\${1:my_file_matcher}" {
  path_targets = [
    {
      __path__ = "\${2:/var/log/*.log}"
      component_id = "\${3:my_loki_source}" // ID of the loki.source.file component
    }
  ]
}`,
    "Componente para monitorear archivos basados en patrones de ruta.",
    "local.file_match \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.processor.resource",
    CompletionItemKind.Snippet,
    `otelcol.processor.resource "\${1:add_service_name}" {
  attributes {
    service.name = "\${2:my-application}"
  }
}`,
    "Componente para añadir o modificar atributos de recursos en OpenTelemetry.",
    "otelcol.processor.resource \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.processor.attributes",
    CompletionItemKind.Snippet,
    `otelcol.processor.attributes "\${1:add_environment}" {
  actions {
    action = "\${2|insert,update,upsert,delete,hash,extract|}"
    key = "\${3:environment}"
    value = "\${4:production}"
  }
}`,
    "Componente para añadir, modificar o eliminar atributos de spans, métricas o logs.",
    "otelcol.processor.attributes \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.processor.transform",
    CompletionItemKind.Snippet,
    `otelcol.processor.transform "\${1:transform_logs}" {
  log_statements {
    context = "\${2|log,resource,scope|}"
    statements = [
      "set(body, "transformed_log") where body == "old_log")",
      "set(attributes["new_attr"], "new_value")"
    ]
  }
}`,
    "Componente para transformar datos de telemetría usando OpenTelemetry Transformation Language (OTTL).",
    "otelcol.processor.transform \"label\" { ... }"
  ),
  createSnippet(
    "prometheus.exporter.unix",
    CompletionItemKind.Snippet,
    `prometheus.exporter.unix "\${1:node_exporter}" {
  // No arguments typically needed for basic usage, exposes node metrics
}`,
    "Componente para exponer métricas del sistema operativo (simulando node_exporter).",
    "prometheus.exporter.unix \"label\" { ... }"
  ),
  createSnippet(
    "prometheus.integration.node_exporter",
    CompletionItemKind.Snippet,
    `prometheus.integration.node_exporter "\${1:my_node_integration}" {
  // Configuración específica de node_exporter
  // Por ejemplo:
  // disable_collectors = ["diskstats"]
}`,
    "Integración para el Node Exporter, recopila métricas del sistema.",
    "prometheus.integration.node_exporter \"label\" { ... }"
  ),
  createSnippet(
    "prometheus.integration.agent_exporter",
    CompletionItemKind.Snippet,
    `prometheus.integration.agent_exporter "\${1:agent_metrics}" {
  // Expose internal Grafana Agent/Alloy metrics
}`,
    "Expone métricas internas de Grafana Alloy.",
    "prometheus.integration.agent_exporter \"label\" { ... }"
  ),
  createSnippet(
    "loki.process",
    CompletionItemKind.Snippet,
    `loki.process "\${1:log_processor}" {
  forward_to = [\${2:/* loki.write.my_loki_writer.receiver */}]
  stage {
    json {
      expressions = {
        message = "message"
        level = "level"
      }
    }
  }
  stage {
    labels {
      level = null
    }
  }
}`,
    "Componente para procesar líneas de log de Loki con pipelines.",
    "loki.process \"label\" { ... }"
  ),
  createSnippet(
    "loki.relabel",
    CompletionItemKind.Snippet,
    `loki.relabel "\${1:log_relabeler}" {
  forward_to = [\${2:/* loki.write.my_loki_writer.receiver */}]
  rule {
    source_labels = ["\${3:filename}"]
    regex = "\${4:(.*)}"
    target_label = "\${5:path}"
    action = "\${6|replace,keep,drop,labelmap,labeldrop,labelkeep|}"
  }
}`,
    "Componente para aplicar reglas de re-etiquetado a flujos de log de Loki.",
    "loki.relabel \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.exporter.loki",
    CompletionItemKind.Snippet,
    `otelcol.exporter.loki "\${1:my_otlp_loki_exporter}" {
  client {
    endpoint = "\${2:http://localhost:3100/loki/api/v1/push}"
  }
}`,
    "Exporta logs OpenTelemetry a Loki.",
    "otelcol.exporter.loki \"label\" { ... }"
  ),
  createSnippet(
    "otelcol.exporter.prometheus_remote_write",
    CompletionItemKind.Snippet,
    `otelcol.exporter.prometheus_remote_write "\${1:my_otlp_prom_remote_write_exporter}" {
  client {
    endpoint = "\${2:http://localhost:9090/api/v1/write}"
  }
}`,
    "Exporta métricas OpenTelemetry a un endpoint Prometheus remote_write.",
    "otelcol.exporter.prometheus_remote_write \"label\" { ... }"
  ),
];

// --- Properties for top-level components and nested blocks ---
// This map will store all possible properties for various blocks.
// Keys will be the block names (e.g., "prometheus.scrape", "endpoint", "output", "http").
const allBlockProperties: Record<string, CompletionItem[]> = {
  // --- Top-level Component Arguments ---
  "prometheus.scrape": [
    createSnippet(
      "targets",
      CompletionItemKind.Property,
      `targets = [
  {
    __address__ = "\${1:localhost:9090}"
  }
]`,
      "Una lista de objetivos para recopilar métricas.",
      "list(map(string)) - requerido"
    ),
    createSnippet(
      "forward_to",
      CompletionItemKind.Property,
      "forward_to = [\${1:/* other.component.label.export_name */}]",
      "Lista de receptores a los que enviar las métricas recopiladas.",
      "list(MetricsReceiver) - requerido"
    ),
    createSnippet(
      "bearer_token",
      CompletionItemKind.Property,
      "bearer_token = \"${1:your_token}\"",
      "Token de portador para autenticación.",
      "secret - opcional"
    ),
    createSnippet(
      "interval",
      CompletionItemKind.Property,
      "interval = \"${1:1m}\"",
      "Frecuencia con la que se recopilan métricas del objetivo.",
      "duration - opcional (defecto: 1m)"
    ),
    createSnippet(
      "honor_labels",
      CompletionItemKind.Property,
      "honor_labels = ${1|true,false|}",
      "Indica si se deben respetar las etiquetas del objetivo.",
      "bool - opcional (defecto: false)"
    ),
    createSnippet(
      "job_name",
      CompletionItemKind.Property,
      "job_name = \"${1:my-job}\"",
      "Etiqueta 'job' a usar para las métricas recopiladas.",
      "string - opcional"
    ),
    createSnippet(
      "metric_relabel_configs",
      CompletionItemKind.Property,
      `metric_relabel_configs = [
  {
    source_labels = ["\${1:__name__}"]
    regex = "\${2:.*}"
    action = "\${3|replace,keep,drop,hashmod,labelmap,labeldrop,labelkeep|}"
  }
]`,
      "Reglas de re-etiquetado para métricas antes de la ingesta.",
      "list(relabel_config) - opcional"
    ),
    createSnippet(
      "tls_config",
      CompletionItemKind.Snippet, // This is a nested block, so its properties are defined under "tls_config"
      `tls_config {
  ca_pem_file = "\${1:path/to/ca.pem}"
  cert_pem_file = "\${2:path/to/cert.pem}"
  key_pem_file = "\${3:path/to/key.pem}"
  insecure_skip_verify = \${4|true,false|}
}`,
      "Configuración TLS para comunicación segura.",
      "tls_config - opcional"
    ),
  ],
  "prometheus.remote_write": [
    createSnippet(
      "endpoint",
      CompletionItemKind.Snippet, // This is a nested block
      `endpoint {
  url = "\${1:http://localhost:9090/api/v1/write}"
  remote_timeout = "\${2:30s}"
}`,
      "Configuración del endpoint remoto.",
      "endpoint_options - requerido"
    ),
    createSnippet(
      "wal_directory",
      CompletionItemKind.Property,
      `wal_directory = "\${1:/tmp/agent-wal}"`,
      "Directorio para el Write-Ahead Log.",
      "string - opcional"
    ),
  ],
  "loki.write": [
    createSnippet(
      "endpoint",
      CompletionItemKind.Snippet, // Nested block
      `endpoint {
  url = "\${1:http://localhost:3100/loki/api/v1/push}"
  bearer_token = "\${2:your_token}"
}`,
      "Configuración del endpoint de Loki.",
      "endpoint_options - requerido"
    ),
    createSnippet(
      "connection_timeout",
      CompletionItemKind.Property,
      `connection_timeout = "\${1:1m}"`,
      "Tiempo máximo de espera para establecer una conexión.",
      "duration - opcional (defecto: 1m)"
    ),
  ],
  "loki.source.file": [
    createSnippet(
      "targets",
      CompletionItemKind.Property,
      `targets = [
  {
    __path__ = "\${1:/var/log/*.log}"
    job = "\${2:mylogs}"
  }
]`,
      "Lista de objetivos de archivos para monitorear.",
      "list(map(string)) - requerido"
    ),
    createSnippet(
      "forward_to",
      CompletionItemKind.Property,
      "forward_to = [\${1:/* loki.write.my_loki_writer.receiver */}]",
      "Lista de receptores a los que enviar los logs.",
      "list(LogsReceiver) - requerido"
    ),
    createSnippet(
      "polling_interval",
      CompletionItemKind.Property,
      `polling_interval = "\${1:1s}"`,
      "Frecuencia para verificar nuevos archivos o cambios.",
      "duration - opcional (defecto: 1s)"
    ),
  ],
  "otelcol.receiver.otlp": [
    createSnippet(
      "http",
      CompletionItemKind.Snippet, // Nested block
      `http {
  endpoint = "\${1:0.0.0.0:4318}"
}`,
      "Configuración para el receptor OTLP HTTP.",
      "http_server_config - opcional"
    ),
    createSnippet(
      "grpc",
      CompletionItemKind.Snippet, // Nested block
      `grpc {
  endpoint = "\${1:0.0.0.0:4317}"
}`,
      "Configuración para el receptor OTLP gRPC.",
      "grpc_server_config - opcional"
    ),
    createSnippet(
      "output",
      CompletionItemKind.Snippet, // Nested block
      `output {
  metrics_receiver = [\${1:/* receiver */}]
  logs_receiver = [\${2:/* receiver */}]
  traces_receiver = [\${3:/* receiver */}]
}`,
      "Definiciones de salida para métricas, logs y trazas.",
      "output_config - requerido"
    ),
  ],
  "otelcol.processor.batch": [
    createSnippet(
      "output",
      CompletionItemKind.Snippet, // Nested block
      `output {
  metrics_receiver = [\${1:/* receiver */}]
  logs_receiver = [\${2:/* receiver */}]
  traces_receiver = [\${3:/* receiver */}]
}`,
      "Definiciones de salida para métricas, logs y trazas después del procesamiento por lotes.",
      "output_config - requerido"
    ),
    createSnippet(
      "timeout",
      CompletionItemKind.Property,
      `timeout = "\${1:5s}"`,
      "Tiempo máximo para agrupar elementos.",
      "duration - opcional (defecto: 5s)"
    ),
    createSnippet(
      "send_batch_size",
      CompletionItemKind.Property,
      `send_batch_size = \${1:1000}`,
      "Número máximo de elementos por lote.",
      "number - opcional (defecto: 1000)"
    ),
  ],
  "otelcol.exporter.otlp": [
    createSnippet(
      "client",
      CompletionItemKind.Snippet, // Nested block
      `client {
  endpoint = "\${1:localhost:4317}"
  tls_config {
    insecure_skip_verify = \${2|true,false|}
  }
}`,
      "Configuración del cliente OTLP.",
      "client_config - requerido"
    ),
  ],
  "otelcol.exporter.prometheus": [
    createSnippet(
      "output",
      CompletionItemKind.Snippet, // Nested block
      `output {
  metrics_receiver = [\${1:/* receiver */}]
}`,
      "Receptores para las métricas exportadas.",
      "output_config - requerido"
    ),
  ],
  "discovery.kubernetes": [
    createSnippet(
      "selectors",
      CompletionItemKind.Snippet, // Nested block
      `selectors {
  role = "\${1|node,pod,endpoint,service,ingress,container|}"
}`,
      "Filtros para seleccionar recursos de Kubernetes.",
      "selectors_config - opcional"
    ),
    createSnippet(
      "kubeconfig_file",
      CompletionItemKind.Property,
      `kubeconfig_file = "\${1:/etc/kubernetes/kubeconfig.yaml}"`,
      "Ruta al archivo kubeconfig.",
      "string - opcional"
    ),
    createSnippet(
      "forward_to",
      CompletionItemKind.Property,
      "forward_to = [\${1:/* prometheus.scrape.my_scraper.targets */}]",
      "Lista de receptores para enviar los objetivos descubiertos.",
      "list(TargetsReceiver) - requerido"
    ),
  ],
  "local.file_match": [
    createSnippet(
      "path_targets",
      CompletionItemKind.Property,
      `path_targets = [
  {
    __path__ = "\${1:/var/log/*.log}"
    component_id = "\${2:my_loki_source}"
  }
]`,
      "Define una lista de objetivos de ruta de archivo y sus IDs de componente asociados.",
      "list(map(string)) - requerido"
    ),
  ],
  "otelcol.processor.resource": [
    createSnippet(
      "attributes",
      CompletionItemKind.Snippet,
      `attributes {
  service.name = "\${1:my-application}"
  host.name = "\${2:my-host}"
}`,
      "Atributos de recursos a añadir o modificar.",
      "attributes_config - requerido"
    ),
  ],
  "otelcol.processor.attributes": [
    createSnippet(
      "actions",
      CompletionItemKind.Snippet,
      `actions {
  action = "\${1|insert,update,upsert,delete,hash,extract|}"
  key = "\${2:environment}"
  value = "\${3:production}"
}`,
      "Acciones para manipular atributos.",
      "list(action_config) - requerido"
    ),
  ],
  "otelcol.processor.transform": [
    createSnippet(
      "log_statements",
      CompletionItemKind.Snippet,
      `log_statements {
  context = "\${1|log,resource,scope|}"
  statements = [
    "set(body, \"transformed_log\") where body == \"old_log\")",
    "set(attributes[\"new_attr\"], \"new_value\")"
  ]
}`,
      "Declaraciones OTTL para transformar logs.",
      "log_statements_config - opcional"
    ),
    createSnippet(
      "metric_statements",
      CompletionItemKind.Snippet,
      `metric_statements {
  context = "\${1|metric,resource,scope,data_point|}"
  statements = [
    "set(attributes[\"new_metric_attr\"], \"new_value\")"
  ]
}`,
      "Declaraciones OTTL para transformar métricas.",
      "metric_statements_config - opcional"
    ),
    createSnippet(
      "trace_statements",
      CompletionItemKind.Snippet,
      `trace_statements {
  context = "\${1|span,resource,scope|}"
  statements = [
    "set(attributes[\"new_trace_attr\"], \"new_value\")"
  ]
}`,
      "Declaraciones OTTL para transformar trazas.",
      "trace_statements_config - opcional"
    ),
  ],
  // ... (other top-level components can be added here)

  // --- Nested Block Properties ---

  "endpoint": [
    createSnippet(
      "url",
      CompletionItemKind.Property,
      `url = "\${1:http://localhost:9090/}"`,
      "URL del endpoint.",
      "string - requerido"
    ),
    createSnippet(
      "bearer_token",
      CompletionItemKind.Property,
      `bearer_token = "\${1:your_token}"`,
      "Token de portador para autenticación.",
      "secret - opcional"
    ),
    createSnippet(
      "basic_auth",
      CompletionItemKind.Snippet,
      `basic_auth {
  username = "\${1:user}"
  password = "\${2:password}"
}`,
      "Configuración de autenticación básica.",
      "basic_auth_config - opcional"
    ),
    createSnippet(
      "tls_config",
      CompletionItemKind.Snippet,
      `tls_config {
  ca_pem_file = "\${1:path/to/ca.pem}"
  cert_pem_file = "\${2:path/to/cert.pem}"
  key_pem_file = "\${3:path/to/key.pem}"
  insecure_skip_verify = \${4|true,false|}
}`,
      "Configuración TLS para comunicación segura.",
      "tls_config - opcional"
    ),
    createSnippet(
      "remote_timeout",
      CompletionItemKind.Property,
      `remote_timeout = "\${1:30s}"`,
      "Tiempo de espera para la escritura remota.",
      "duration - opcional (defecto: 30s)"
    ),
  ],
  "tls_config": [
    createSnippet(
      "ca_pem_file",
      CompletionItemKind.Property,
      `ca_pem_file = "\${1:path/to/ca.pem}"`,
      "Ruta al archivo CA PEM.",
      "string - opcional"
    ),
    createSnippet(
      "cert_pem_file",
      CompletionItemKind.Property,
      `cert_pem_file = "\${1:path/to/cert.pem}"`,
      "Ruta al archivo de certificado PEM.",
      "string - opcional"
    ),
    createSnippet(
      "key_pem_file",
      CompletionItemKind.Property,
      `key_pem_file = "\${1:path/to/key.pem}"`,
      "Ruta al archivo de clave PEM.",
      "string - opcional"
    ),
    createSnippet(
      "insecure_skip_verify",
      CompletionItemKind.Property,
      `insecure_skip_verify = \${1|true,false|}`,
      "Saltar la verificación de certificado TLS.",
      "bool - opcional (defecto: false)"
    ),
  ],
  "http": [ // For otelcol.receiver.otlp.http
    createSnippet(
      "endpoint",
      CompletionItemKind.Property,
      `endpoint = "\${1:0.0.0.0:4318}"`,
      "Dirección del endpoint HTTP.",
      "string - opcional (defecto: 0.0.0.0:4318)"
    ),
    createSnippet(
      "cors_allowed_headers",
      CompletionItemKind.Property,
      `cors_allowed_headers = ["\${1:X-Something}"]`,
      "Cabeceras CORS permitidas.",
      "list(string) - opcional"
    ),
  ],
  "grpc": [ // For otelcol.receiver.otlp.grpc
    createSnippet(
      "endpoint",
      CompletionItemKind.Property,
      `endpoint = "\${1:0.0.0.0:4317}"`,
      "Dirección del endpoint gRPC.",
      "string - opcional (defecto: 0.0.0.0:4317)"
    ),
    createSnippet(
      "max_recv_msg_size_mib",
      CompletionItemKind.Property,
      `max_recv_msg_size_mib = \${1:100}`,
      "Tamaño máximo del mensaje recibido en MiB.",
      "number - opcional (defecto: 100)"
    ),
  ],
  "output": [ // For otelcol.receiver.otlp.output, otelcol.processor.batch.output, etc.
    createSnippet(
      "metrics_receiver",
      CompletionItemKind.Property,
      `metrics_receiver = [\${1:/* receiver */}]`,
      "Receptores para métricas.",
      "list(MetricsReceiver) - opcional"
    ),
    createSnippet(
      "logs_receiver",
      CompletionItemKind.Property,
      `logs_receiver = [\${1:/* receiver */}]`,
      "Receptores para logs.",
      "list(LogsReceiver) - opcional"
    ),
    createSnippet(
      "traces_receiver",
      CompletionItemKind.Property,
      `traces_receiver = [\${1:/* receiver */}]`,
      "Receptores para trazas.",
      "list(TracesReceiver) - opcional"
    ),
  ],
  "client": [ // For otelcol.exporter.otlp.client
    createSnippet(
      "endpoint",
      CompletionItemKind.Property,
      `endpoint = "\${1:localhost:4317}"`,
      "Dirección del endpoint del cliente.",
      "string - requerido"
    ),
    createSnippet(
      "tls_config",
      CompletionItemKind.Snippet,
      `tls_config {
  insecure_skip_verify = \${1|true,false|}
}`,
      "Configuración TLS para el cliente.",
      "tls_config - opcional"
    ),
    createSnippet(
      "compression",
      CompletionItemKind.Property,
      `compression = "\${1|gzip,zlib,none|}"`,
      "Compresión a usar.",
      "string - opcional (defecto: none)"
    ),
  ],
  "selectors": [ // For discovery.kubernetes.selectors
    createSnippet(
      "role",
      CompletionItemKind.Property,
      `role = "\${1|node,pod,endpoint,service,ingress,container|}"`,
      "Rol del recurso de Kubernetes a descubrir.",
      "string - requerido"
    ),
    createSnippet(
      "label_selector",
      CompletionItemKind.Property,
      `label_selector = "\${1:app=my-app,environment=production}"`,
      "Selector de etiquetas de Kubernetes.",
      "string - opcional"
    ),
  ],
  "attributes": [ // For otelcol.processor.resource.attributes, otelcol.processor.attributes.attributes
    createSnippet(
      "service.name",
      CompletionItemKind.Property,
      `service.name = "\${1:my-application}"`,
      "Nombre del servicio.",
      "string - opcional"
    ),
    createSnippet(
      "host.name",
      CompletionItemKind.Property,
      `host.name = "\${1:my-host}"`,
      "Nombre del host.",
      "string - opcional"
    ),
    createSnippet(
      "environment",
      CompletionItemKind.Property,
      `environment = "\${1:production}"`,
      "Entorno.",
      "string - opcional"
    ),
  ],
  "actions": [ // For otelcol.processor.attributes.actions
    createSnippet(
      "action",
      CompletionItemKind.Property,
      `action = "\${1|insert,update,upsert,delete,hash,extract|}"`,
      "Tipo de acción a realizar.",
      "string - requerido"
    ),
    createSnippet(
      "key",
      CompletionItemKind.Property,
      `key = "\${1:my_attribute}"`,
      "Clave del atributo.",
      "string - requerido"
    ),
    createSnippet(
      "value",
      CompletionItemKind.Property,
      `value = "\${1:my_value}"`,
      "Valor del atributo.",
      "string - opcional (requerido para insert, update, upsert)"
    ),
    createSnippet(
      "from_attribute",
      CompletionItemKind.Property,
      `from_attribute = "\${1:source_attribute}"`,
      "Atributo de origen para copiar valor.",
      "string - opcional (usado con action 'insert' o 'update')"
    ),
  ],
  "log_statements": [ // For otelcol.processor.transform.log_statements
    createSnippet(
      "context",
      CompletionItemKind.Property,
      `context = "\${1|log,resource,scope|}"`,
      "Contexto para las declaraciones OTTL.",
      "string - requerido"
    ),
    createSnippet(
      "statements",
      CompletionItemKind.Property,
      `statements = [
  "\${1:set(body, \"new_body\") where body == \"old_body\"}",
  "\${2:set(attributes[\"my_attr\"], \"my_value\")}"
]`,
      "Lista de declaraciones OTTL.",
      "list(string) - requerido"
    ),
  ],
  "stage": [ // For loki.process.stage
    createSnippet(
      "json",
      CompletionItemKind.Snippet,
      `json {
  expressions = {
    "\${1:field_name}" = "\${2:target_label}"
  }
}`,
      "Extraer campos JSON de la línea de log.",
      "json_stage_config - opcional"
    ),
    createSnippet(
      "regex",
      CompletionItemKind.Snippet,
      `regex {
  expression = "\${1:^(\\S+) (\\S+)}"
  labels = {
    "\${2:label_name}" = "\${3:capture_group}"
  }
}`,
      "Extraer campos usando expresiones regulares.",
      "regex_stage_config - opcional"
    ),
    createSnippet(
      "labels",
      CompletionItemKind.Snippet,
      `labels {
  "\${1:label_name}" = null // or "value"
}`,
      "Modificar o establecer etiquetas.",
      "labels_stage_config - opcional"
    ),
    createSnippet(
      "output",
      CompletionItemKind.Property,
      `output = "\${1:output_value}"`,
      "Campo de salida para la etapa (sobrescribe la línea de log).",
      "string - opcional"
    ),
  ],
  "json": [ // For loki.process.stage.json
    createSnippet(
      "expressions",
      CompletionItemKind.Property,
      `expressions = {
  "\${1:field_name}" = "\${2:target_label}"
}`,
      "Expresiones JSON a extraer.",
      "map(string) - requerido"
    ),
    createSnippet(
      "drop_field",
      CompletionItemKind.Property,
      `drop_field = \${1|true,false|}`,
      "Eliminar el campo extraído de la línea de log.",
      "bool - opcional (defecto: false)"
    ),
  ],
  "labels": [ // For loki.process.stage.labels
    createSnippet(
      "label_name", // Placeholder for actual label name
      CompletionItemKind.Property,
      `\${1:label_name} = "\${2:label_value}"`,
      "Un nombre de etiqueta y su valor (o null para eliminar).",
      "string | null"
    ),
  ],
  "rule": [ // For loki.relabel.rule
    createSnippet(
      "source_labels",
      CompletionItemKind.Property,
      `source_labels = ["\${1:__name__}"]`,
      "Etiquetas de origen para la regla.",
      "list(string) - requerido"
    ),
    createSnippet(
      "regex",
      CompletionItemKind.Property,
      `regex = "\${1:.*}"`,
      "Expresión regular para aplicar.",
      "string - opcional (defecto: .*) "
    ),
    createSnippet(
      "target_label",
      CompletionItemKind.Property,
      `target_label = "\${1:new_label}"`,
      "Etiqueta de destino para la regla.",
      "string - opcional (requerido para 'replace')"
    ),
    createSnippet(
      "action",
      CompletionItemKind.Property,
      `action = "\${1|replace,keep,drop,hashmod,labelmap,labeldrop,labelkeep|}"`,
      "Acción a realizar.",
      "string - requerido"
    ),
    createSnippet(
      "replacement",
      CompletionItemKind.Property,
      `replacement = "\${1:$1}"`,
      "Valor de reemplazo para la acción.",
      "string - opcional (defecto: $1)"
    ),
  ],
  // You would continue to add entries for other nested blocks
  // like `basic_auth`, `http_client_config`, `grpc_client_config`, etc.
};


// --- onCompletion handler with improved logic ---
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return [];
  }

  const linePrefix = document.getText({
    start: { line: textDocumentPosition.position.line, character: 0 },
    end: textDocumentPosition.position,
  });

  const fullContentBeforeCursor = document.getText().slice(0, document.offsetAt(textDocumentPosition.position));

  // Determine current indentation level
  const leadingWhitespaceMatch = linePrefix.match(/^\s*/);
  const currentIndent = leadingWhitespaceMatch ? leadingWhitespaceMatch[0].length : 0;

  // Find the most relevant parent block by looking for the last unclosed "{"
  // and then identifying the block type associated with it.
  // This is a simplified approach and a full AST parser would be more robust.
  const lines = fullContentBeforeCursor.split('\n');
  let currentBlockType: string | null = null;
  let openBraceCount = 0;
  let lastBlockName: string | null = null;

  // Iterate backwards through lines to find the current block context
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.endsWith('{')) {
      openBraceCount++;
    } else if (trimmedLine.endsWith('}')) {
      openBraceCount--;
    }

    // Try to identify a block name
    // Matches: 'component.type "label" {', 'block_name {', 'property_name {'
    const blockRegex = /^(\s*)([a-zA-Z_][a-zA-Z0-9_.]*)(\s+"[^"]*")?\s*\{/;
    const match = line.match(blockRegex);

    if (match) {
      const blockIndent = match[1].length;
      const blockName = match[2];

      // If we are at the current or just one level deeper than the current open brace,
      // and it's a block definition, consider it the parent
      if (openBraceCount > 0 && blockIndent < currentIndent) {
        lastBlockName = blockName; // This is the component or block type
        break; // Found the parent block
      } else if (openBraceCount === 0 && i === lines.length - 1) { // If it's the very first block
         lastBlockName = blockName;
         break;
      }
    }
  }

  if (lastBlockName) {
    // Return properties for the identified block
    return allBlockProperties[lastBlockName] || [];
  }

  // If no specific block context is found (e.g., beginning of file or outside any block)
  // suggest top-level component snippets.
  if (currentIndent === 0) { // Assume top-level if no indentation
    return componentSnippets;
  }

  return []; // No relevant suggestions
});

connection.onInitialize(() => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [".", "{", "=", " ", "\n"], // Added newline as trigger for block contents
      },
    },
  };
  return result;
});

// Haz que el gestor de documentos de texto escuche la conexión
// para eventos de apertura, cambio y cierre de documentos de texto.
documents.listen(connection);

// Escucha en la conexión.
connection.listen();
