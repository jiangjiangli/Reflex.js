package html.impl;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import html.IHtmlJsAutoImporter;

public class HtmlJsAutoImporterImpl implements IHtmlJsAutoImporter {

	private String dir;
	
	private Thread checkThread;
	
	private boolean isDisposed;
	
	private Map<String, Html> path2HtmlMap = new HashMap<String, Html>();
	
	private Map<String, Html> path2HtmlAllMap = new HashMap<String, Html>();
	
	private static final String IMPORT_BEGIN_TAG="<!--children-js-begin-->";
	private static final String IMPORT_END_TAG="<!--children-js-end-->";
	
	private static final String IMPORT_RECEPT_ROUTER_BEGIN_TAG="<!--recept-router-begin-->";
	private static final String IMPORT_RECEPT_ROUTER_END_TAG="<!--recept-router-end-->";
	
	
	private static final String HEAD_END_TAG="</head>";
	
	private static final  String RECEPT_ROUTER_JS_SUBFFIX= "recept-router.js";
	@Override
	public void handleOn(String dir) {
		this.dir = dir;
		checkThread = new Thread(new Runnable() {			
			@Override
			public void run() {
				runInThread();
			}
		});
		checkThread.setDaemon(true);;
		checkThread.start();
	}
	
	private void runInThread()
	{
		int k = 0;
		while(!isDisposed)
		{
			try {
				//过2s就同步带@前缀的html
				if(k >= 2)
				{
					List<String> pages = listPageHtmls(this.dir);
					Map<String, Html> newMap = new HashMap<String, Html>();
					if(pages != null)
					{
						for(String page : pages)
						{
							newMap.put(page, path2HtmlMap.get(page));
						}
					}
					path2HtmlMap = newMap;
					
					
					List<String> htmls = listAllHtmls(this.dir);
					newMap = new HashMap<String, Html>();
					if(htmls != null)
					{
						for(String html : htmls)
						{
							newMap.put(html, path2HtmlAllMap.get(html));
						}
					}
					path2HtmlAllMap = newMap;
				}
				//更新所有html的receptor-router.js
				for(Map.Entry<String, Html> pair : path2HtmlAllMap.entrySet())
				{
					importReceptorJsIfNeeded(pair.getKey());
				}
				
				//每1s就检查页面是否更新了，然后自动导入
				for(Map.Entry<String, Html> pair : path2HtmlMap.entrySet())
				{
					checkAndUpdate(pair.getKey());
				}
				Thread.sleep(1000);
				k++;
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
	private void checkAndUpdate(String path)
	{
		Html html = path2HtmlMap.get(path);
		if(html == null)
		{
			html = createHtml(path);
			path2HtmlMap.put(path, html);
			importJs4Html(html);
			return;
		}
		//检查几个html是否发生了改变，如果没发生，就不做事
		if(!isChanged(html))
		{
			return;
		}
		importJs4Html(html);
	}
	

	private void importJs4Html(Html html)
	{
		html.checkAndUpdateReceptAndRouter();

		List<String> children = new ArrayList<String>();
		addChildrenJs(html, children);
		importJs(html, IMPORT_BEGIN_TAG,IMPORT_END_TAG, children);
		
		List<String> receptorAndRouterJs = new ArrayList<String>();
		getImportReceptAndRouterRefJs(html, receptorAndRouterJs);
		if(html.isAnyReceptAndRouterExist())
		{
			receptorAndRouterJs.add(getReceptAndRouterJsName(html, RECEPT_ROUTER_JS_SUBFFIX));
		}
		importJs(html, IMPORT_RECEPT_ROUTER_BEGIN_TAG,IMPORT_RECEPT_ROUTER_END_TAG, receptorAndRouterJs);
	}
	
	private String getReceptAndRouterJsName(Html html, String subffix)
	{
		int index = html.name.lastIndexOf(".");
		String name = index < 0 ? html.name : html.name.substring(0, index);
		return name + "-" + subffix;
	}
	
	private void importJs(Html html, String tagBegin, String tagEnd, List<String> paths)
	{
		String path = html.path;
		boolean inImportRegin = false;
		boolean foundImportRegion=false;
		StringBuffer sb = new StringBuffer();
		//import js
		try {

			BufferedReader reader = new BufferedReader(new FileReader(path));
			String line = reader.readLine();
			while(line != null)
			{
				if(line.trim().startsWith(tagBegin))
				{
					inImportRegin = true;
					foundImportRegion = true;
					sb.append(line);
					sb.append("\r\n");
					// import 
					addJsTags(sb, html,paths);
				}
				else if(line.trim().startsWith(tagEnd))
				{
					inImportRegin = false;
					sb.append(line);
					sb.append("\r\n");
				}
				else if(line.trim().toLowerCase().startsWith(HEAD_END_TAG))
				{
					if(!foundImportRegion)
					{
						sb.append(tagBegin);
						sb.append("\r\n");
						// import 
						addJsTags(sb, html,paths);
						sb.append(tagEnd);
						sb.append("\r\n");
					}
					sb.append(line);
					sb.append("\r\n");
				}
				else if(!inImportRegin)
				{
					sb.append(line);
					sb.append("\r\n");
				}
				line = reader.readLine();
			}
			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		try {
			PrintWriter writer = new PrintWriter(new File(path));
			writer.write(sb.toString());
			writer.flush();
			writer.close();
		} catch (Exception e) {
			
			e.printStackTrace();
		}
	}
	
	private void addJsTags(StringBuffer sb, Html html, List<String> paths)
	{
		for(String path : paths)
		{
			sb.append("	<script src='" + path + "'></script>\r\n");	
		}
	}
	
	private void addChildrenJs(Html html,List<String> jss)
	{
		List<Html> children  = html.children;
		if(children == null)
		{
			return;
		}
		for(Html child : children)
		{
			addChildrenJs(child,jss);
			
			List<String> scripts = child.scripts;
			for(String item : scripts)
			{
				jss.add(item);
			}
			jss.add(child.name + ".js");
		}
	}
	
	private Html createHtml(String path)
	{
		Html html = new Html(path);
		File file = new File(path);
		html.lastMofied = file.lastModified();
		//parse html
		DocumentBuilderFactory fac= DocumentBuilderFactory.newInstance();
		//用上面的工厂创建一个文档解析器
        DocumentBuilder builder;
        
        List<String> list = new ArrayList<String>();
		try {
			builder = fac.newDocumentBuilder();
			Document doc=builder.parse(path);
			
			NodeList scripts = doc.getElementsByTagName("script");
			int length = scripts.getLength();
			for(int i = 0; i < length; i++)
			{
				Element node = (Element) scripts.item(i);
				if(node.hasAttribute("src"))
				{
					list.add(node.getAttribute("src"));
				}
			}
			//include html
			List<String> includes = listInclude(html.dir, doc.getDocumentElement());
			if(includes  != null)
			{
				List<Html> children = new ArrayList<HtmlJsAutoImporterImpl.Html>();
				for(String item : includes)
				{
					children.add(createHtml(item));
				}
				html.children = children;
			}
			
		} catch (Exception e) {
			
			e.printStackTrace();
		}
		html.scripts = list;
		return html;
	}

	
	/**
	 * html以及include 子孙 结构发生了改变 
	 * @param html
	 * @return
	 */
	private boolean isChanged(Html html)
	{
		long lastModified = html.lastMofied;
		File file = new File(html.path);
		//检查自己改变
		if(file.lastModified() != lastModified)
		{
			Html changed = createHtml(html.path);
			if(html.childrenChanged(changed))
			{
				html.update(changed);
				return true;
			}
		}
		//如果自己没改变，就看孩子是否改变
		if(html.children == null)
		{
			return false;
		}
		for(Html child : html.children)
		{
			if(isIncludedHtmlChanged(child))
			{
				return true;
			}
		}
		return false;
	}
	
	private boolean isIncludedHtmlChanged(Html html)
	{
		long lastModified = html.lastMofied;
		File file = new File(html.path);
		//检查改变
		if(file.lastModified() != lastModified)
		{
			Html changed = createHtml(html.path);
			html2Js(html.path, html.name,html.path + ".js");
			if(html.scriptsAndChildrenChanged(changed))
			{
				html.update(changed);
				return true;
			}
		}
		//如果自己没改变，就看孩子是否改变
		if(html.children == null)
		{
			return false;
		}
		for(Html child : html.children)
		{
			if(isIncludedHtmlChanged(child))
			{
				return true;
			}
		}
		return false;
	}
	
	
	/**
	    *      如有必要，自动导入receptor-router.js,并生成它们
	 * @param path
	 */
	private void importReceptorJsIfNeeded(String path)
	{
		Html html = path2HtmlAllMap.get(path);
		if(html == null)
		{
			html = new Html(path);
			path2HtmlAllMap.put(path, html);
		}
		int status = html.checkAndUpdateReceptAndRouter();
		if(status == 0)
		{
			return;
		}

		//存在状态发生了变化
		if(status == 1)
		{
			//不存在
			if(!html.isAnyReceptAndRouterExist())
			{
				return;
			}
			//更新receptor-router.js
			generateReceptorRouterjs(html,RECEPT_ROUTER_JS_SUBFFIX);
			//引用js
			List<String> receptorJss = new ArrayList<String>();
			getImportReceptAndRouterRefJs(html, receptorJss);
			receptorJss.add(getReceptAndRouterJsName(html, RECEPT_ROUTER_JS_SUBFFIX));
			//导入
			importJs(html, IMPORT_RECEPT_ROUTER_BEGIN_TAG,IMPORT_RECEPT_ROUTER_END_TAG, receptorJss);
			return;
		}
		//更新receptor-router.js
		generateReceptorRouterjs(html,RECEPT_ROUTER_JS_SUBFFIX);
		//引用js
		List<String> jsList = new ArrayList<String>();
		getImportReceptAndRouterRefJs(html, jsList);
		jsList.add(getReceptAndRouterJsName(html, RECEPT_ROUTER_JS_SUBFFIX));
		//导入
		importJs(html, IMPORT_RECEPT_ROUTER_BEGIN_TAG,IMPORT_RECEPT_ROUTER_END_TAG, jsList);
	}
	
	private void getImportReceptAndRouterRefJs(Html html, List<String> jsList)
	{
		if(!html.isAnyReceptAndRouterExist())
		{
			return;
		}
		StringBuffer sb = new StringBuffer();
		if(html.receptorPath != null)
		{
			read(html.receptorPath, sb);
			getImportReceptRefJs(sb.toString(), jsList);
		}
	}
	
	private void getImportReceptRefJs(String receptor, List<String> jsList)
	{
		Pattern pattern = Pattern.compile("[^\\{\\}]+\\{[^\\{\\}]+\\}");
		Matcher matcher = pattern.matcher(receptor);
		while (matcher.find()) {
		    String res = matcher.group();
		    getImportReceptGroupRefJs(res, jsList);
		}
	}
	
	private void getImportReceptGroupRefJs(String group, List<String> jsList)
	{
		int index = group.indexOf("{");
		int endIndex = group.lastIndexOf("}");
		String groupInner = group.substring(index+1, endIndex).trim();
		List<String> items = considerGroupSplit(groupInner, ',');
		for(String item : items)
		{
			int k = item.lastIndexOf(":");
			if(k <= 0)
			{
				continue;
			}
			String conditions = item.substring(0, k);
			getImportReceptConditionsRefJs(conditions, jsList);
		}
	}
	
	private void getImportReceptConditionsRefJs(String conditions, List<String> jsList)
	{
		Pattern pattern = Pattern.compile("\\w+");
		Matcher matcher = pattern.matcher(conditions);
		List<String> words = new ArrayList<String>();
		while (matcher.find()) {
		    String res = matcher.group();
		    words.add(res);
		}
		
		Pattern pattern1 = Pattern.compile("['\"]\\w+['\"]");
		Matcher matcher1 = pattern1.matcher(conditions);
		List<String> values = new ArrayList<String>();
		while (matcher1.find()) {
		    String res = matcher1.group();
		    values.add(res.substring(1,res.length()-1));
		}
		words.removeAll(values);
		int count = words.size();
		while(--count >= 0)
		{
			try
			{
				double number  = Double.parseDouble(words.get(count));
				if(!Double.isNaN(number))
				{
					words.remove(count);
				}
			}
			catch(Exception ex)
			{
				
			}	
		}
		//get all states
		for(String state : words)
		{
			jsList.add("../js/" + state + "_state.js");
		}
	}
	
	
	private void generateReceptorRouterjs(Html html, String subffix)
	{
		File dirFile = new File(html.path).getParentFile();
		String name = getReceptAndRouterJsName(html, subffix);
		String dest = dirFile.getAbsolutePath() + File.separator + name;
		//import js
		try {

			StringBuffer sb = new StringBuffer();
			PrintWriter writer = new PrintWriter(new File(dest));
			if(html.receptorPath != null)
			{
				File file = new File(html.receptorPath);
				name = file.getName().replace(".", "_");
				name = name.replace("@", "");
				writer.write("var reflex$" + name + "=`\r\n");
				read(html.receptorPath, sb);
				
				writer.write(sb.toString());
				writer.write("\r\n");
				writer.write("`");
				
				sb.setLength(0);
			}
			writer.write("\r\n");
			if(html.routerPath != null)
			{
				File file = new File(html.routerPath);
				name = file.getName().replace(".", "_");
				name = name.replace("@", "");
				writer.write("var reflex$" + name + "=`\r\n");
				read(html.routerPath, sb);
				
				writer.write(sb.toString());
				writer.write("\r\n");
				writer.write("`");
				
				sb.setLength(0);
			}

			writer.flush();
			writer.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	private void read(String path, StringBuffer sb)
	{
		try {
			BufferedReader reader = new BufferedReader(new FileReader(path));
			String line = reader.readLine();
			while(line != null)
			{
				sb.append(line);	
				sb.append("\r\n");
				line = reader.readLine();
			}
			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	
	private void html2Js(String src,String name, String dest)
	{
		//import js
		try {

			PrintWriter writer = new PrintWriter(new File(dest));
			BufferedReader reader = new BufferedReader(new FileReader(src));
			String line = reader.readLine();
			name = name.replace(".", "_");
			writer.write("var reflex$" + name + "=`\r\n");
			while(line != null)
			{
				writer.write(line);	
				writer.write("\r\n");
				line = reader.readLine();
			}
			writer.write("`");
			reader.close();
			writer.flush();
			writer.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	
	private List<String> listInclude(String dir, Element element)
	{
		List<String> result =null;
		if(element.hasAttribute("include"))
		{
			result = new ArrayList<String>();
			result.add(dir + File.separator + element.getAttribute("include"));
		}
		NodeList children = element.getChildNodes();
		int length = children.getLength();
		for(int i = 0; i < length; i++)
		{
			Node node = children.item(i);
			if(node.getNodeType() != Node.ELEMENT_NODE)
			{
				continue;
			}
			List<String> childrenIncludes =  listInclude(dir, (Element)node);
			if(childrenIncludes != null)
			{
				if(result == null)
				{
					result = new ArrayList<String>();
				}
				result.addAll(childrenIncludes);
			}
		}
		return result;
	}
	
 	private List<String> listPageHtmls(String dir)
	{
		File dirFile = new File(dir);
		if(!dirFile.exists())
		{
			return null;
		}
		List<String> result = new ArrayList<String>();
		File[] children = dirFile.listFiles();
		for(File child : children)
		{
			if(child.isDirectory())
			{
				 List<String> files = listPageHtmls(child.getAbsolutePath());
				 if(files != null)
				 {
					 result.addAll(files);
				 }
				 continue;
			}
			if(!child.getAbsolutePath().endsWith(".html"))
			{
				continue;
			}
			if(child.getName().startsWith("@"))
			{
				result.add(child.getAbsolutePath());
			}
		}
		return result;
	}
 	
 	
 	private List<String> listAllHtmls(String dir)
	{
		File dirFile = new File(dir);
		if(!dirFile.exists())
		{
			return null;
		}
		List<String> result = new ArrayList<String>();
		File[] children = dirFile.listFiles();
		for(File child : children)
		{
			if(child.isDirectory())
			{
				 List<String> files = listAllHtmls(child.getAbsolutePath());
				 if(files != null)
				 {
					 result.addAll(files);
				 }
				 continue;
			}
			if(!child.getAbsolutePath().endsWith(".html"))
			{
				continue;
			}
			result.add(child.getAbsolutePath());
		}
		return result;
	}
 	
 	//在group外面，使用split
 	List<String> considerGroupSplit(String value, char seperator)
 	{
 		int length  = value.length();
 		int groupCount = 0;
 		int indexLast = 0;
 		List<String> result = new ArrayList<String>();
 		for(int i = 0; i < length; i++)
 		{
 			char charOne = value.charAt(i);
 			switch(charOne)
 			{
 				case '{':
 				case '(':
 					groupCount++;
 					break;
 				case '}':
 				case ')':
 					groupCount--;
 					break;
 				default:
 					if(charOne != seperator)
 					{
 						break;
 					}
 					if(groupCount == 0)
 					{
 						result.add(value.substring(indexLast, i));
 						indexLast = i+1;
 					}
 					break;
 			}
 		}
 		if(length > indexLast)
 		{
 				result.add(value.substring(indexLast, length));
 		}
 		return result;
 	}
	
	
	private static class Html
	{
		private String path;
		private String name;
		private String dir;
		private long lastMofied;
		
		//本页面自己的js
		private List<String> scripts;
		
		private List<Html> children;
		
		
		private String receptorPath;
		private long receptorLastModified;
		
		private String routerPath;
		private long routerLastModified;
		
		public Html(String path)
		{
			this.path = path;
			int index =  path.lastIndexOf(File.separator);
			this.name = path.substring(index+1);
			this.dir = path.substring(0, index);
		}
		
		public void update(Html another)
		{
			this.lastMofied = another.lastMofied;
			this.scripts = another.scripts;
			this.children = another.children;
			
			this.receptorPath = another.receptorPath;
			this.receptorLastModified = another.receptorLastModified;
			
			this.routerPath = another.routerPath;
			this.routerLastModified = another.routerLastModified;
		}
		
		private boolean scriptsAndChildrenChanged(Html anotherHtml)
		{
			int scriptsLength = scripts == null ? 0 : scripts.size();
			int childrenLength = children == null ? 0 : children.size();
			
			int scripts1Length = anotherHtml.scripts == null ? 0 : anotherHtml.scripts.size();
			int children1Length = anotherHtml.children == null ? 0 : anotherHtml.children.size();
			
			if(scriptsLength != scripts1Length)
			{
				return true;
			}
			if(children1Length != childrenLength)
			{
				return true;
			}
			
			if(scripts1Length != 0)
			{
				for(String script : scripts)
				{
					if(!anotherHtml.scripts.contains(script))
					{
						return true;
					}
				}
			}
			if(children1Length != 0)
			{
				for(Html p : children)
				{
					if(!anotherHtml.children.contains(p))
					{
						return true;
					}
				}
			}
			
			return false;
		}
		
		private boolean childrenChanged(Html anotherHtml)
		{
			int childrenLength = children == null ? 0 : children.size();

			int children1Length = anotherHtml.children == null ? 0 : anotherHtml.children.size();
			

			if(children1Length != childrenLength)
			{
				return true;
			}

			if(children1Length == 0)
			{
				return false;
			}
			
			for(Html p : children)
			{
				if(!anotherHtml.children.contains(p))
				{
					return true;
				}
			}
			return false;
		}
		
		/**
		 *  html receptor ,router存在状态是否发生了变化。
		 * @return
		 */
		private boolean receptAndRouterChanged(Html anotherHtml)
		{
			String receptor = this.receptorPath == null ? "" : this.receptorPath;
			String receptor1 = anotherHtml.receptorPath == null ? "" : anotherHtml.receptorPath;
			if(!receptor.equals(receptor1))
			{
				return true;
			}
			String router = this.routerPath == null ? "" : this.routerPath;
			String router1 = anotherHtml.routerPath == null ? "" : anotherHtml.routerPath;
			if(!router.equals(router1))
			{
				return true;
			}
			return false;
		}
		
		/**
		 *     更新html receptor ,router的状态。
		 * @return 0:没有发生变化;1,是否存在发生了变化；2，存在没有发生变化，但lastmodified时间变了
		 */
		private int checkAndUpdateReceptAndRouter()
		{
			File file = new File(this.path);
			File receptFile = getSameNameFile(file, ".recept");
			String oldReceptor = this.receptorPath == null ? "" : this.receptorPath;
			String oldRouter = this.routerPath == null ? "" : this.routerPath;
			boolean timeChanged = false;
			if(receptFile != null)
			{
				this.receptorPath = receptFile.getAbsolutePath();
				timeChanged = this.receptorLastModified != receptFile.lastModified();
				this.receptorLastModified = receptFile.lastModified();
			}
			else
			{
				this.receptorPath = null;
				this.receptorLastModified = 0;
			}
			
			File routerFile = getSameNameFile(file, ".router");
			if(routerFile != null)
			{
				this.routerPath = routerFile.getAbsolutePath();
				if(!timeChanged)
				{
					timeChanged = this.routerLastModified != routerFile.lastModified();
				}
				this.routerLastModified = routerFile.lastModified();
			}
			else
			{
				this.routerPath = null;
				this.routerLastModified = 0;
			}
			
			String currentReceptor = this.receptorPath == null ? "" : this.receptorPath;
			String currentRouter = this.routerPath == null ? "" : this.routerPath;
			boolean existChanged =  !oldReceptor.equals(currentReceptor) || !oldRouter.equals(currentRouter);
			if(existChanged)
			{
				return 1;
			}
			return timeChanged ? 1 : 0;
		}
		
		public boolean isAnyReceptAndRouterExist()
		{
			return  this.receptorPath != null || this.routerPath != null;
		}
		
		public boolean equals(Object item)
		{
			if(!(item instanceof Html))
			{
				return true;
			}
			return this.path.equals(((Html)item).path);
		}
		
		
		private File getSameNameFile(File html, String subbfix)
		{
			String dir  = html.getParent();
			String name = html.getName();
			int subbfixIndex = name.lastIndexOf(".");
			name = subbfixIndex < 0 ? name : name.substring(0, subbfixIndex);
			String receptorPath = dir + File.separator + name + subbfix;
			File file = new File(receptorPath);
			if(file.exists())
			{
				return file;
			}
			return null;
		}
	}
}
